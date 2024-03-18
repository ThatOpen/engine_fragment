import * as THREE from 'three';
import { BufferAttribute, Vector3, Vector2, Plane, Line3, Triangle, Sphere, Matrix4, Box3, BackSide, DoubleSide, FrontSide, Mesh, Ray, BufferGeometry } from 'three';

class FragmentMesh extends THREE.InstancedMesh {
    constructor(geometry, material, count, fragment) {
        super(geometry, material, count);
        if (!Array.isArray(material)) {
            material = [material];
        }
        this.material = material;
        if (!geometry.index) {
            throw new Error("The geometry for fragments must be indexed!");
        }
        this.geometry = geometry;
        this.fragment = fragment;
        const size = geometry.index.count;
        if (!geometry.groups.length) {
            geometry.groups.push({
                start: 0,
                count: size,
                materialIndex: 0,
            });
        }
    }
    exportData() {
        const position = this.geometry.attributes.position.array;
        const normal = this.geometry.attributes.normal.array;
        const index = Array.from(this.geometry.index.array);
        const groups = [];
        for (const group of this.geometry.groups) {
            const index = group.materialIndex || 0;
            const { start, count } = group;
            groups.push(start, count, index);
        }
        const materials = [];
        if (Array.isArray(this.material)) {
            for (const material of this.material) {
                const opacity = material.opacity;
                const transparent = material.transparent ? 1 : 0;
                const color = new THREE.Color(material.color).toArray();
                materials.push(opacity, transparent, ...color);
            }
        }
        const matrices = Array.from(this.instanceMatrix.array);
        let colors;
        if (this.instanceColor !== null) {
            colors = Array.from(this.instanceColor.array);
        }
        else {
            colors = [];
        }
        return {
            position,
            normal,
            index,
            groups,
            materials,
            matrices,
            colors,
        };
    }
}

// Split strategy constants
const CENTER = 0;
const AVERAGE = 1;
const SAH = 2;
const CONTAINED = 2;

// SAH cost constants
// TODO: hone these costs more. The relative difference between them should be the
// difference in measured time to perform a triangle intersection vs traversing
// bounds.
const TRIANGLE_INTERSECT_COST = 1.25;
const TRAVERSAL_COST = 1;


// Build constants
const BYTES_PER_NODE = 6 * 4 + 4 + 4;
const IS_LEAFNODE_FLAG = 0xFFFF;

// EPSILON for computing floating point error during build
// https://en.wikipedia.org/wiki/Machine_epsilon#Values_for_standard_hardware_floating_point_arithmetics
const FLOAT32_EPSILON = Math.pow( 2, - 24 );

const SKIP_GENERATION = Symbol( 'SKIP_GENERATION' );

function getVertexCount( geo ) {

	return geo.index ? geo.index.count : geo.attributes.position.count;

}

function getTriCount( geo ) {

	return getVertexCount( geo ) / 3;

}

function getIndexArray( vertexCount, BufferConstructor = ArrayBuffer ) {

	if ( vertexCount > 65535 ) {

		return new Uint32Array( new BufferConstructor( 4 * vertexCount ) );

	} else {

		return new Uint16Array( new BufferConstructor( 2 * vertexCount ) );

	}

}

// ensures that an index is present on the geometry
function ensureIndex( geo, options ) {

	if ( ! geo.index ) {

		const vertexCount = geo.attributes.position.count;
		const BufferConstructor = options.useSharedArrayBuffer ? SharedArrayBuffer : ArrayBuffer;
		const index = getIndexArray( vertexCount, BufferConstructor );
		geo.setIndex( new BufferAttribute( index, 1 ) );

		for ( let i = 0; i < vertexCount; i ++ ) {

			index[ i ] = i;

		}

	}

}

// Computes the set of { offset, count } ranges which need independent BVH roots. Each
// region in the geometry index that belongs to a different set of material groups requires
// a separate BVH root, so that triangles indices belonging to one group never get swapped
// with triangle indices belongs to another group. For example, if the groups were like this:
//
// [-------------------------------------------------------------]
// |__________________|
//   g0 = [0, 20]  |______________________||_____________________|
//                      g1 = [16, 40]           g2 = [41, 60]
//
// we would need four BVH roots: [0, 15], [16, 20], [21, 40], [41, 60].
function getFullGeometryRange( geo ) {

	const triCount = getTriCount( geo );
	const drawRange = geo.drawRange;
	const start = drawRange.start / 3;
	const end = ( drawRange.start + drawRange.count ) / 3;

	const offset = Math.max( 0, start );
	const count = Math.min( triCount, end ) - offset;
	return [ {
		offset: Math.floor( offset ),
		count: Math.floor( count ),
	} ];

}

function getRootIndexRanges( geo ) {

	if ( ! geo.groups || ! geo.groups.length ) {

		return getFullGeometryRange( geo );

	}

	const ranges = [];
	const rangeBoundaries = new Set();

	const drawRange = geo.drawRange;
	const drawRangeStart = drawRange.start / 3;
	const drawRangeEnd = ( drawRange.start + drawRange.count ) / 3;
	for ( const group of geo.groups ) {

		const groupStart = group.start / 3;
		const groupEnd = ( group.start + group.count ) / 3;
		rangeBoundaries.add( Math.max( drawRangeStart, groupStart ) );
		rangeBoundaries.add( Math.min( drawRangeEnd, groupEnd ) );

	}


	// note that if you don't pass in a comparator, it sorts them lexicographically as strings :-(
	const sortedBoundaries = Array.from( rangeBoundaries.values() ).sort( ( a, b ) => a - b );
	for ( let i = 0; i < sortedBoundaries.length - 1; i ++ ) {

		const start = sortedBoundaries[ i ];
		const end = sortedBoundaries[ i + 1 ];

		ranges.push( {
			offset: Math.floor( start ),
			count: Math.floor( end - start ),
		} );

	}

	return ranges;

}

function hasGroupGaps( geometry ) {

	if ( geometry.groups.length === 0 ) {

		return false;

	}

	const vertexCount = getTriCount( geometry );
	const groups = getRootIndexRanges( geometry )
		.sort( ( a, b ) => a.offset - b.offset );

	const finalGroup = groups[ groups.length - 1 ];
	finalGroup.count = Math.min( vertexCount - finalGroup.offset, finalGroup.count );

	let total = 0;
	groups.forEach( ( { count } ) => total += count );
	return vertexCount !== total;

}

function arrayToBox( nodeIndex32, array, target ) {

	target.min.x = array[ nodeIndex32 ];
	target.min.y = array[ nodeIndex32 + 1 ];
	target.min.z = array[ nodeIndex32 + 2 ];

	target.max.x = array[ nodeIndex32 + 3 ];
	target.max.y = array[ nodeIndex32 + 4 ];
	target.max.z = array[ nodeIndex32 + 5 ];

	return target;

}

function makeEmptyBounds( target ) {

	target[ 0 ] = target[ 1 ] = target[ 2 ] = Infinity;
	target[ 3 ] = target[ 4 ] = target[ 5 ] = - Infinity;

}

function getLongestEdgeIndex( bounds ) {

	let splitDimIdx = - 1;
	let splitDist = - Infinity;

	for ( let i = 0; i < 3; i ++ ) {

		const dist = bounds[ i + 3 ] - bounds[ i ];
		if ( dist > splitDist ) {

			splitDist = dist;
			splitDimIdx = i;

		}

	}

	return splitDimIdx;

}

// copies bounds a into bounds b
function copyBounds( source, target ) {

	target.set( source );

}

// sets bounds target to the union of bounds a and b
function unionBounds( a, b, target ) {

	let aVal, bVal;
	for ( let d = 0; d < 3; d ++ ) {

		const d3 = d + 3;

		// set the minimum values
		aVal = a[ d ];
		bVal = b[ d ];
		target[ d ] = aVal < bVal ? aVal : bVal;

		// set the max values
		aVal = a[ d3 ];
		bVal = b[ d3 ];
		target[ d3 ] = aVal > bVal ? aVal : bVal;

	}

}

// expands the given bounds by the provided triangle bounds
function expandByTriangleBounds( startIndex, triangleBounds, bounds ) {

	for ( let d = 0; d < 3; d ++ ) {

		const tCenter = triangleBounds[ startIndex + 2 * d ];
		const tHalf = triangleBounds[ startIndex + 2 * d + 1 ];

		const tMin = tCenter - tHalf;
		const tMax = tCenter + tHalf;

		if ( tMin < bounds[ d ] ) {

			bounds[ d ] = tMin;

		}

		if ( tMax > bounds[ d + 3 ] ) {

			bounds[ d + 3 ] = tMax;

		}

	}

}

// compute bounds surface area
function computeSurfaceArea( bounds ) {

	const d0 = bounds[ 3 ] - bounds[ 0 ];
	const d1 = bounds[ 4 ] - bounds[ 1 ];
	const d2 = bounds[ 5 ] - bounds[ 2 ];

	return 2 * ( d0 * d1 + d1 * d2 + d2 * d0 );

}

// computes the union of the bounds of all of the given triangles and puts the resulting box in target. If
// centroidTarget is provided then a bounding box is computed for the centroids of the triangles, as well.
// These are computed together to avoid redundant accesses to bounds array.
function getBounds( triangleBounds, offset, count, target, centroidTarget = null ) {

	let minx = Infinity;
	let miny = Infinity;
	let minz = Infinity;
	let maxx = - Infinity;
	let maxy = - Infinity;
	let maxz = - Infinity;

	let cminx = Infinity;
	let cminy = Infinity;
	let cminz = Infinity;
	let cmaxx = - Infinity;
	let cmaxy = - Infinity;
	let cmaxz = - Infinity;

	const includeCentroid = centroidTarget !== null;
	for ( let i = offset * 6, end = ( offset + count ) * 6; i < end; i += 6 ) {

		const cx = triangleBounds[ i + 0 ];
		const hx = triangleBounds[ i + 1 ];
		const lx = cx - hx;
		const rx = cx + hx;
		if ( lx < minx ) minx = lx;
		if ( rx > maxx ) maxx = rx;
		if ( includeCentroid && cx < cminx ) cminx = cx;
		if ( includeCentroid && cx > cmaxx ) cmaxx = cx;

		const cy = triangleBounds[ i + 2 ];
		const hy = triangleBounds[ i + 3 ];
		const ly = cy - hy;
		const ry = cy + hy;
		if ( ly < miny ) miny = ly;
		if ( ry > maxy ) maxy = ry;
		if ( includeCentroid && cy < cminy ) cminy = cy;
		if ( includeCentroid && cy > cmaxy ) cmaxy = cy;

		const cz = triangleBounds[ i + 4 ];
		const hz = triangleBounds[ i + 5 ];
		const lz = cz - hz;
		const rz = cz + hz;
		if ( lz < minz ) minz = lz;
		if ( rz > maxz ) maxz = rz;
		if ( includeCentroid && cz < cminz ) cminz = cz;
		if ( includeCentroid && cz > cmaxz ) cmaxz = cz;

	}

	target[ 0 ] = minx;
	target[ 1 ] = miny;
	target[ 2 ] = minz;

	target[ 3 ] = maxx;
	target[ 4 ] = maxy;
	target[ 5 ] = maxz;

	if ( includeCentroid ) {

		centroidTarget[ 0 ] = cminx;
		centroidTarget[ 1 ] = cminy;
		centroidTarget[ 2 ] = cminz;

		centroidTarget[ 3 ] = cmaxx;
		centroidTarget[ 4 ] = cmaxy;
		centroidTarget[ 5 ] = cmaxz;

	}

}

// A stand alone function for retrieving the centroid bounds.
function getCentroidBounds( triangleBounds, offset, count, centroidTarget ) {

	let cminx = Infinity;
	let cminy = Infinity;
	let cminz = Infinity;
	let cmaxx = - Infinity;
	let cmaxy = - Infinity;
	let cmaxz = - Infinity;

	for ( let i = offset * 6, end = ( offset + count ) * 6; i < end; i += 6 ) {

		const cx = triangleBounds[ i + 0 ];
		if ( cx < cminx ) cminx = cx;
		if ( cx > cmaxx ) cmaxx = cx;

		const cy = triangleBounds[ i + 2 ];
		if ( cy < cminy ) cminy = cy;
		if ( cy > cmaxy ) cmaxy = cy;

		const cz = triangleBounds[ i + 4 ];
		if ( cz < cminz ) cminz = cz;
		if ( cz > cmaxz ) cmaxz = cz;

	}

	centroidTarget[ 0 ] = cminx;
	centroidTarget[ 1 ] = cminy;
	centroidTarget[ 2 ] = cminz;

	centroidTarget[ 3 ] = cmaxx;
	centroidTarget[ 4 ] = cmaxy;
	centroidTarget[ 5 ] = cmaxz;

}


// precomputes the bounding box for each triangle; required for quickly calculating tree splits.
// result is an array of size tris.length * 6 where triangle i maps to a
// [x_center, x_delta, y_center, y_delta, z_center, z_delta] tuple starting at index i * 6,
// representing the center and half-extent in each dimension of triangle i
function computeTriangleBounds( geo, fullBounds ) {

	// clear the bounds to empty
	makeEmptyBounds( fullBounds );

	const posAttr = geo.attributes.position;
	const index = geo.index ? geo.index.array : null;
	const triCount = getTriCount( geo );
	const triangleBounds = new Float32Array( triCount * 6 );
	const normalized = posAttr.normalized;

	// used for non-normalized positions
	const posArr = posAttr.array;

	// support for an interleaved position buffer
	const bufferOffset = posAttr.offset || 0;
	let stride = 3;
	if ( posAttr.isInterleavedBufferAttribute ) {

		stride = posAttr.data.stride;

	}

	// used for normalized positions
	const getters = [ 'getX', 'getY', 'getZ' ];

	for ( let tri = 0; tri < triCount; tri ++ ) {

		const tri3 = tri * 3;
		const tri6 = tri * 6;

		let ai = tri3 + 0;
		let bi = tri3 + 1;
		let ci = tri3 + 2;

		if ( index ) {

			ai = index[ ai ];
			bi = index[ bi ];
			ci = index[ ci ];

		}

		// we add the stride and offset here since we access the array directly
		// below for the sake of performance
		if ( ! normalized ) {

			ai = ai * stride + bufferOffset;
			bi = bi * stride + bufferOffset;
			ci = ci * stride + bufferOffset;

		}

		for ( let el = 0; el < 3; el ++ ) {

			let a, b, c;

			if ( normalized ) {

				a = posAttr[ getters[ el ] ]( ai );
				b = posAttr[ getters[ el ] ]( bi );
				c = posAttr[ getters[ el ] ]( ci );

			} else {

				a = posArr[ ai + el ];
				b = posArr[ bi + el ];
				c = posArr[ ci + el ];

			}

			let min = a;
			if ( b < min ) min = b;
			if ( c < min ) min = c;

			let max = a;
			if ( b > max ) max = b;
			if ( c > max ) max = c;

			// Increase the bounds size by float32 epsilon to avoid precision errors when
			// converting to 32 bit float. Scale the epsilon by the size of the numbers being
			// worked with.
			const halfExtents = ( max - min ) / 2;
			const el2 = el * 2;
			triangleBounds[ tri6 + el2 + 0 ] = min + halfExtents;
			triangleBounds[ tri6 + el2 + 1 ] = halfExtents + ( Math.abs( min ) + halfExtents ) * FLOAT32_EPSILON;

			if ( min < fullBounds[ el ] ) fullBounds[ el ] = min;
			if ( max > fullBounds[ el + 3 ] ) fullBounds[ el + 3 ] = max;

		}

	}

	return triangleBounds;

}

const BIN_COUNT = 32;
const binsSort = ( a, b ) => a.candidate - b.candidate;
const sahBins = new Array( BIN_COUNT ).fill().map( () => {

	return {

		count: 0,
		bounds: new Float32Array( 6 ),
		rightCacheBounds: new Float32Array( 6 ),
		leftCacheBounds: new Float32Array( 6 ),
		candidate: 0,

	};

} );
const leftBounds = new Float32Array( 6 );

function getOptimalSplit( nodeBoundingData, centroidBoundingData, triangleBounds, offset, count, strategy ) {

	let axis = - 1;
	let pos = 0;

	// Center
	if ( strategy === CENTER ) {

		axis = getLongestEdgeIndex( centroidBoundingData );
		if ( axis !== - 1 ) {

			pos = ( centroidBoundingData[ axis ] + centroidBoundingData[ axis + 3 ] ) / 2;

		}

	} else if ( strategy === AVERAGE ) {

		axis = getLongestEdgeIndex( nodeBoundingData );
		if ( axis !== - 1 ) {

			pos = getAverage( triangleBounds, offset, count, axis );

		}

	} else if ( strategy === SAH ) {

		const rootSurfaceArea = computeSurfaceArea( nodeBoundingData );
		let bestCost = TRIANGLE_INTERSECT_COST * count;

		// iterate over all axes
		const cStart = offset * 6;
		const cEnd = ( offset + count ) * 6;
		for ( let a = 0; a < 3; a ++ ) {

			const axisLeft = centroidBoundingData[ a ];
			const axisRight = centroidBoundingData[ a + 3 ];
			const axisLength = axisRight - axisLeft;
			const binWidth = axisLength / BIN_COUNT;

			// If we have fewer triangles than we're planning to split then just check all
			// the triangle positions because it will be faster.
			if ( count < BIN_COUNT / 4 ) {

				// initialize the bin candidates
				const truncatedBins = [ ...sahBins ];
				truncatedBins.length = count;

				// set the candidates
				let b = 0;
				for ( let c = cStart; c < cEnd; c += 6, b ++ ) {

					const bin = truncatedBins[ b ];
					bin.candidate = triangleBounds[ c + 2 * a ];
					bin.count = 0;

					const {
						bounds,
						leftCacheBounds,
						rightCacheBounds,
					} = bin;
					for ( let d = 0; d < 3; d ++ ) {

						rightCacheBounds[ d ] = Infinity;
						rightCacheBounds[ d + 3 ] = - Infinity;

						leftCacheBounds[ d ] = Infinity;
						leftCacheBounds[ d + 3 ] = - Infinity;

						bounds[ d ] = Infinity;
						bounds[ d + 3 ] = - Infinity;

					}

					expandByTriangleBounds( c, triangleBounds, bounds );

				}

				truncatedBins.sort( binsSort );

				// remove redundant splits
				let splitCount = count;
				for ( let bi = 0; bi < splitCount; bi ++ ) {

					const bin = truncatedBins[ bi ];
					while ( bi + 1 < splitCount && truncatedBins[ bi + 1 ].candidate === bin.candidate ) {

						truncatedBins.splice( bi + 1, 1 );
						splitCount --;

					}

				}

				// find the appropriate bin for each triangle and expand the bounds.
				for ( let c = cStart; c < cEnd; c += 6 ) {

					const center = triangleBounds[ c + 2 * a ];
					for ( let bi = 0; bi < splitCount; bi ++ ) {

						const bin = truncatedBins[ bi ];
						if ( center >= bin.candidate ) {

							expandByTriangleBounds( c, triangleBounds, bin.rightCacheBounds );

						} else {

							expandByTriangleBounds( c, triangleBounds, bin.leftCacheBounds );
							bin.count ++;

						}

					}

				}

				// expand all the bounds
				for ( let bi = 0; bi < splitCount; bi ++ ) {

					const bin = truncatedBins[ bi ];
					const leftCount = bin.count;
					const rightCount = count - bin.count;

					// check the cost of this split
					const leftBounds = bin.leftCacheBounds;
					const rightBounds = bin.rightCacheBounds;

					let leftProb = 0;
					if ( leftCount !== 0 ) {

						leftProb = computeSurfaceArea( leftBounds ) / rootSurfaceArea;

					}

					let rightProb = 0;
					if ( rightCount !== 0 ) {

						rightProb = computeSurfaceArea( rightBounds ) / rootSurfaceArea;

					}

					const cost = TRAVERSAL_COST + TRIANGLE_INTERSECT_COST * (
						leftProb * leftCount + rightProb * rightCount
					);

					if ( cost < bestCost ) {

						axis = a;
						bestCost = cost;
						pos = bin.candidate;

					}

				}

			} else {

				// reset the bins
				for ( let i = 0; i < BIN_COUNT; i ++ ) {

					const bin = sahBins[ i ];
					bin.count = 0;
					bin.candidate = axisLeft + binWidth + i * binWidth;

					const bounds = bin.bounds;
					for ( let d = 0; d < 3; d ++ ) {

						bounds[ d ] = Infinity;
						bounds[ d + 3 ] = - Infinity;

					}

				}

				// iterate over all center positions
				for ( let c = cStart; c < cEnd; c += 6 ) {

					const triCenter = triangleBounds[ c + 2 * a ];
					const relativeCenter = triCenter - axisLeft;

					// in the partition function if the centroid lies on the split plane then it is
					// considered to be on the right side of the split
					let binIndex = ~ ~ ( relativeCenter / binWidth );
					if ( binIndex >= BIN_COUNT ) binIndex = BIN_COUNT - 1;

					const bin = sahBins[ binIndex ];
					bin.count ++;

					expandByTriangleBounds( c, triangleBounds, bin.bounds );

				}

				// cache the unioned bounds from right to left so we don't have to regenerate them each time
				const lastBin = sahBins[ BIN_COUNT - 1 ];
				copyBounds( lastBin.bounds, lastBin.rightCacheBounds );
				for ( let i = BIN_COUNT - 2; i >= 0; i -- ) {

					const bin = sahBins[ i ];
					const nextBin = sahBins[ i + 1 ];
					unionBounds( bin.bounds, nextBin.rightCacheBounds, bin.rightCacheBounds );

				}

				let leftCount = 0;
				for ( let i = 0; i < BIN_COUNT - 1; i ++ ) {

					const bin = sahBins[ i ];
					const binCount = bin.count;
					const bounds = bin.bounds;

					const nextBin = sahBins[ i + 1 ];
					const rightBounds = nextBin.rightCacheBounds;

					// don't do anything with the bounds if the new bounds have no triangles
					if ( binCount !== 0 ) {

						if ( leftCount === 0 ) {

							copyBounds( bounds, leftBounds );

						} else {

							unionBounds( bounds, leftBounds, leftBounds );

						}

					}

					leftCount += binCount;

					// check the cost of this split
					let leftProb = 0;
					let rightProb = 0;

					if ( leftCount !== 0 ) {

						leftProb = computeSurfaceArea( leftBounds ) / rootSurfaceArea;

					}

					const rightCount = count - leftCount;
					if ( rightCount !== 0 ) {

						rightProb = computeSurfaceArea( rightBounds ) / rootSurfaceArea;

					}

					const cost = TRAVERSAL_COST + TRIANGLE_INTERSECT_COST * (
						leftProb * leftCount + rightProb * rightCount
					);

					if ( cost < bestCost ) {

						axis = a;
						bestCost = cost;
						pos = bin.candidate;

					}

				}

			}

		}

	} else {

		console.warn( `MeshBVH: Invalid build strategy value ${ strategy } used.` );

	}

	return { axis, pos };

}

// returns the average coordinate on the specified axis of the all the provided triangles
function getAverage( triangleBounds, offset, count, axis ) {

	let avg = 0;
	for ( let i = offset, end = offset + count; i < end; i ++ ) {

		avg += triangleBounds[ i * 6 + axis * 2 ];

	}

	return avg / count;

}

class MeshBVHNode {

	constructor() {

		// internal nodes have boundingData, left, right, and splitAxis
		// leaf nodes have offset and count (referring to primitives in the mesh geometry)

	}

}

/********************************************************/
/* This file is generated from "sortUtils.template.js". */
/********************************************************/
// reorders `tris` such that for `count` elements after `offset`, elements on the left side of the split
// will be on the left and elements on the right side of the split will be on the right. returns the index
// of the first element on the right side, or offset + count if there are no elements on the right side.
function partition( indirectBuffer, index, triangleBounds, offset, count, split ) {

	let left = offset;
	let right = offset + count - 1;
	const pos = split.pos;
	const axisOffset = split.axis * 2;

	// hoare partitioning, see e.g. https://en.wikipedia.org/wiki/Quicksort#Hoare_partition_scheme
	while ( true ) {

		while ( left <= right && triangleBounds[ left * 6 + axisOffset ] < pos ) {

			left ++;

		}

		// if a triangle center lies on the partition plane it is considered to be on the right side
		while ( left <= right && triangleBounds[ right * 6 + axisOffset ] >= pos ) {

			right --;

		}

		if ( left < right ) {

			// we need to swap all of the information associated with the triangles at index
			// left and right; that's the verts in the geometry index, the bounds,
			// and perhaps the SAH planes

			for ( let i = 0; i < 3; i ++ ) {

				let t0 = index[ left * 3 + i ];
				index[ left * 3 + i ] = index[ right * 3 + i ];
				index[ right * 3 + i ] = t0;

			}


			// swap bounds
			for ( let i = 0; i < 6; i ++ ) {

				let tb = triangleBounds[ left * 6 + i ];
				triangleBounds[ left * 6 + i ] = triangleBounds[ right * 6 + i ];
				triangleBounds[ right * 6 + i ] = tb;

			}

			left ++;
			right --;

		} else {

			return left;

		}

	}

}

/********************************************************/
/* This file is generated from "sortUtils.template.js". */
/********************************************************/
// reorders `tris` such that for `count` elements after `offset`, elements on the left side of the split
// will be on the left and elements on the right side of the split will be on the right. returns the index
// of the first element on the right side, or offset + count if there are no elements on the right side.
function partition_indirect( indirectBuffer, index, triangleBounds, offset, count, split ) {

	let left = offset;
	let right = offset + count - 1;
	const pos = split.pos;
	const axisOffset = split.axis * 2;

	// hoare partitioning, see e.g. https://en.wikipedia.org/wiki/Quicksort#Hoare_partition_scheme
	while ( true ) {

		while ( left <= right && triangleBounds[ left * 6 + axisOffset ] < pos ) {

			left ++;

		}

		// if a triangle center lies on the partition plane it is considered to be on the right side
		while ( left <= right && triangleBounds[ right * 6 + axisOffset ] >= pos ) {

			right --;

		}

		if ( left < right ) {

			// we need to swap all of the information associated with the triangles at index
			// left and right; that's the verts in the geometry index, the bounds,
			// and perhaps the SAH planes
			let t = indirectBuffer[ left ];
			indirectBuffer[ left ] = indirectBuffer[ right ];
			indirectBuffer[ right ] = t;


			// swap bounds
			for ( let i = 0; i < 6; i ++ ) {

				let tb = triangleBounds[ left * 6 + i ];
				triangleBounds[ left * 6 + i ] = triangleBounds[ right * 6 + i ];
				triangleBounds[ right * 6 + i ] = tb;

			}

			left ++;
			right --;

		} else {

			return left;

		}

	}

}

function generateIndirectBuffer( geometry, useSharedArrayBuffer ) {

	const triCount = ( geometry.index ? geometry.index.count : geometry.attributes.position.count ) / 3;
	const useUint32 = triCount > 2 ** 16;
	const byteCount = useUint32 ? 4 : 2;

	const buffer = useSharedArrayBuffer ? new SharedArrayBuffer( triCount * byteCount ) : new ArrayBuffer( triCount * byteCount );
	const indirectBuffer = useUint32 ? new Uint32Array( buffer ) : new Uint16Array( buffer );
	for ( let i = 0, l = indirectBuffer.length; i < l; i ++ ) {

		indirectBuffer[ i ] = i;

	}

	return indirectBuffer;

}

function buildTree( bvh, options ) {

	// Compute the full bounds of the geometry at the same time as triangle bounds because
	// we'll need it for the root bounds in the case with no groups and it should be fast here.
	// We can't use the geometry bounding box if it's available because it may be out of date.
	const geometry = bvh.geometry;
	const indexArray = geometry.index ? geometry.index.array : null;
	const maxDepth = options.maxDepth;
	const verbose = options.verbose;
	const maxLeafTris = options.maxLeafTris;
	const strategy = options.strategy;
	const onProgress = options.onProgress;
	const totalTriangles = getTriCount( geometry );
	const indirectBuffer = bvh._indirectBuffer;
	let reachedMaxDepth = false;

	const fullBounds = new Float32Array( 6 );
	const cacheCentroidBoundingData = new Float32Array( 6 );
	const triangleBounds = computeTriangleBounds( geometry, fullBounds );
	const partionFunc = options.indirect ? partition_indirect : partition;

	const roots = [];
	const ranges = options.indirect ? getFullGeometryRange( geometry ) : getRootIndexRanges( geometry );

	if ( ranges.length === 1 ) {

		const range = ranges[ 0 ];
		const root = new MeshBVHNode();
		root.boundingData = fullBounds;
		getCentroidBounds( triangleBounds, range.offset, range.count, cacheCentroidBoundingData );

		splitNode( root, range.offset, range.count, cacheCentroidBoundingData );
		roots.push( root );

	} else {

		for ( let range of ranges ) {

			const root = new MeshBVHNode();
			root.boundingData = new Float32Array( 6 );
			getBounds( triangleBounds, range.offset, range.count, root.boundingData, cacheCentroidBoundingData );

			splitNode( root, range.offset, range.count, cacheCentroidBoundingData );
			roots.push( root );

		}

	}

	return roots;

	function triggerProgress( trianglesProcessed ) {

		if ( onProgress ) {

			onProgress( trianglesProcessed / totalTriangles );

		}

	}

	// either recursively splits the given node, creating left and right subtrees for it, or makes it a leaf node,
	// recording the offset and count of its triangles and writing them into the reordered geometry index.
	function splitNode( node, offset, count, centroidBoundingData = null, depth = 0 ) {

		if ( ! reachedMaxDepth && depth >= maxDepth ) {

			reachedMaxDepth = true;
			if ( verbose ) {

				console.warn( `MeshBVH: Max depth of ${ maxDepth } reached when generating BVH. Consider increasing maxDepth.` );
				console.warn( geometry );

			}

		}

		// early out if we've met our capacity
		if ( count <= maxLeafTris || depth >= maxDepth ) {

			triggerProgress( offset + count );
			node.offset = offset;
			node.count = count;
			return node;

		}

		// Find where to split the volume
		const split = getOptimalSplit( node.boundingData, centroidBoundingData, triangleBounds, offset, count, strategy );
		if ( split.axis === - 1 ) {

			triggerProgress( offset + count );
			node.offset = offset;
			node.count = count;
			return node;

		}

		const splitOffset = partionFunc( indirectBuffer, indexArray, triangleBounds, offset, count, split );

		// create the two new child nodes
		if ( splitOffset === offset || splitOffset === offset + count ) {

			triggerProgress( offset + count );
			node.offset = offset;
			node.count = count;

		} else {

			node.splitAxis = split.axis;

			// create the left child and compute its bounding box
			const left = new MeshBVHNode();
			const lstart = offset;
			const lcount = splitOffset - offset;
			node.left = left;
			left.boundingData = new Float32Array( 6 );

			getBounds( triangleBounds, lstart, lcount, left.boundingData, cacheCentroidBoundingData );
			splitNode( left, lstart, lcount, cacheCentroidBoundingData, depth + 1 );

			// repeat for right
			const right = new MeshBVHNode();
			const rstart = splitOffset;
			const rcount = count - lcount;
			node.right = right;
			right.boundingData = new Float32Array( 6 );

			getBounds( triangleBounds, rstart, rcount, right.boundingData, cacheCentroidBoundingData );
			splitNode( right, rstart, rcount, cacheCentroidBoundingData, depth + 1 );

		}

		return node;

	}

}

function buildPackedTree( bvh, options ) {

	const geometry = bvh.geometry;
	if ( options.indirect ) {

		bvh._indirectBuffer = generateIndirectBuffer( geometry, options.useSharedArrayBuffer );

		if ( hasGroupGaps( geometry ) && ! options.verbose ) {

			console.warn(
				'MeshBVH: Provided geometry contains groups that do not fully span the vertex contents while using the "indirect" option. ' +
				'BVH may incorrectly report intersections on unrendered portions of the geometry.'
			);

		}

	}

	if ( ! bvh._indirectBuffer ) {

		ensureIndex( geometry, options );

	}

	// boundingData  				: 6 float32
	// right / offset 				: 1 uint32
	// splitAxis / isLeaf + count 	: 1 uint32 / 2 uint16
	const roots = buildTree( bvh, options );

	let float32Array;
	let uint32Array;
	let uint16Array;
	const packedRoots = [];
	const BufferConstructor = options.useSharedArrayBuffer ? SharedArrayBuffer : ArrayBuffer;
	for ( let i = 0; i < roots.length; i ++ ) {

		const root = roots[ i ];
		let nodeCount = countNodes( root );

		const buffer = new BufferConstructor( BYTES_PER_NODE * nodeCount );
		float32Array = new Float32Array( buffer );
		uint32Array = new Uint32Array( buffer );
		uint16Array = new Uint16Array( buffer );
		populateBuffer( 0, root );
		packedRoots.push( buffer );

	}

	bvh._roots = packedRoots;
	return;

	function countNodes( node ) {

		if ( node.count ) {

			return 1;

		} else {

			return 1 + countNodes( node.left ) + countNodes( node.right );

		}

	}

	function populateBuffer( byteOffset, node ) {

		const stride4Offset = byteOffset / 4;
		const stride2Offset = byteOffset / 2;
		const isLeaf = ! ! node.count;
		const boundingData = node.boundingData;
		for ( let i = 0; i < 6; i ++ ) {

			float32Array[ stride4Offset + i ] = boundingData[ i ];

		}

		if ( isLeaf ) {

			const offset = node.offset;
			const count = node.count;
			uint32Array[ stride4Offset + 6 ] = offset;
			uint16Array[ stride2Offset + 14 ] = count;
			uint16Array[ stride2Offset + 15 ] = IS_LEAFNODE_FLAG;
			return byteOffset + BYTES_PER_NODE;

		} else {

			const left = node.left;
			const right = node.right;
			const splitAxis = node.splitAxis;

			let nextUnusedPointer;
			nextUnusedPointer = populateBuffer( byteOffset + BYTES_PER_NODE, left );

			if ( ( nextUnusedPointer / 4 ) > Math.pow( 2, 32 ) ) {

				throw new Error( 'MeshBVH: Cannot store child pointer greater than 32 bits.' );

			}

			uint32Array[ stride4Offset + 6 ] = nextUnusedPointer / 4;
			nextUnusedPointer = populateBuffer( nextUnusedPointer, right );

			uint32Array[ stride4Offset + 7 ] = splitAxis;
			return nextUnusedPointer;

		}

	}

}

class SeparatingAxisBounds {

	constructor() {

		this.min = Infinity;
		this.max = - Infinity;

	}

	setFromPointsField( points, field ) {

		let min = Infinity;
		let max = - Infinity;
		for ( let i = 0, l = points.length; i < l; i ++ ) {

			const p = points[ i ];
			const val = p[ field ];
			min = val < min ? val : min;
			max = val > max ? val : max;

		}

		this.min = min;
		this.max = max;

	}

	setFromPoints( axis, points ) {

		let min = Infinity;
		let max = - Infinity;
		for ( let i = 0, l = points.length; i < l; i ++ ) {

			const p = points[ i ];
			const val = axis.dot( p );
			min = val < min ? val : min;
			max = val > max ? val : max;

		}

		this.min = min;
		this.max = max;

	}

	isSeparated( other ) {

		return this.min > other.max || other.min > this.max;

	}

}

SeparatingAxisBounds.prototype.setFromBox = ( function () {

	const p = new Vector3();
	return function setFromBox( axis, box ) {

		const boxMin = box.min;
		const boxMax = box.max;
		let min = Infinity;
		let max = - Infinity;
		for ( let x = 0; x <= 1; x ++ ) {

			for ( let y = 0; y <= 1; y ++ ) {

				for ( let z = 0; z <= 1; z ++ ) {

					p.x = boxMin.x * x + boxMax.x * ( 1 - x );
					p.y = boxMin.y * y + boxMax.y * ( 1 - y );
					p.z = boxMin.z * z + boxMax.z * ( 1 - z );

					const val = axis.dot( p );
					min = Math.min( val, min );
					max = Math.max( val, max );

				}

			}

		}

		this.min = min;
		this.max = max;

	};

} )();

const closestPointLineToLine = ( function () {

	// https://github.com/juj/MathGeoLib/blob/master/src/Geometry/Line.cpp#L56
	const dir1 = new Vector3();
	const dir2 = new Vector3();
	const v02 = new Vector3();
	return function closestPointLineToLine( l1, l2, result ) {

		const v0 = l1.start;
		const v10 = dir1;
		const v2 = l2.start;
		const v32 = dir2;

		v02.subVectors( v0, v2 );
		dir1.subVectors( l1.end, l1.start );
		dir2.subVectors( l2.end, l2.start );

		// float d0232 = v02.Dot(v32);
		const d0232 = v02.dot( v32 );

		// float d3210 = v32.Dot(v10);
		const d3210 = v32.dot( v10 );

		// float d3232 = v32.Dot(v32);
		const d3232 = v32.dot( v32 );

		// float d0210 = v02.Dot(v10);
		const d0210 = v02.dot( v10 );

		// float d1010 = v10.Dot(v10);
		const d1010 = v10.dot( v10 );

		// float denom = d1010*d3232 - d3210*d3210;
		const denom = d1010 * d3232 - d3210 * d3210;

		let d, d2;
		if ( denom !== 0 ) {

			d = ( d0232 * d3210 - d0210 * d3232 ) / denom;

		} else {

			d = 0;

		}

		d2 = ( d0232 + d * d3210 ) / d3232;

		result.x = d;
		result.y = d2;

	};

} )();

const closestPointsSegmentToSegment = ( function () {

	// https://github.com/juj/MathGeoLib/blob/master/src/Geometry/LineSegment.cpp#L187
	const paramResult = new Vector2();
	const temp1 = new Vector3();
	const temp2 = new Vector3();
	return function closestPointsSegmentToSegment( l1, l2, target1, target2 ) {

		closestPointLineToLine( l1, l2, paramResult );

		let d = paramResult.x;
		let d2 = paramResult.y;
		if ( d >= 0 && d <= 1 && d2 >= 0 && d2 <= 1 ) {

			l1.at( d, target1 );
			l2.at( d2, target2 );

			return;

		} else if ( d >= 0 && d <= 1 ) {

			// Only d2 is out of bounds.
			if ( d2 < 0 ) {

				l2.at( 0, target2 );

			} else {

				l2.at( 1, target2 );

			}

			l1.closestPointToPoint( target2, true, target1 );
			return;

		} else if ( d2 >= 0 && d2 <= 1 ) {

			// Only d is out of bounds.
			if ( d < 0 ) {

				l1.at( 0, target1 );

			} else {

				l1.at( 1, target1 );

			}

			l2.closestPointToPoint( target1, true, target2 );
			return;

		} else {

			// Both u and u2 are out of bounds.
			let p;
			if ( d < 0 ) {

				p = l1.start;

			} else {

				p = l1.end;

			}

			let p2;
			if ( d2 < 0 ) {

				p2 = l2.start;

			} else {

				p2 = l2.end;

			}

			const closestPoint = temp1;
			const closestPoint2 = temp2;
			l1.closestPointToPoint( p2, true, temp1 );
			l2.closestPointToPoint( p, true, temp2 );

			if ( closestPoint.distanceToSquared( p2 ) <= closestPoint2.distanceToSquared( p ) ) {

				target1.copy( closestPoint );
				target2.copy( p2 );
				return;

			} else {

				target1.copy( p );
				target2.copy( closestPoint2 );
				return;

			}

		}

	};

} )();


const sphereIntersectTriangle = ( function () {

	// https://stackoverflow.com/questions/34043955/detect-collision-between-sphere-and-triangle-in-three-js
	const closestPointTemp = new Vector3();
	const projectedPointTemp = new Vector3();
	const planeTemp = new Plane();
	const lineTemp = new Line3();
	return function sphereIntersectTriangle( sphere, triangle ) {

		const { radius, center } = sphere;
		const { a, b, c } = triangle;

		// phase 1
		lineTemp.start = a;
		lineTemp.end = b;
		const closestPoint1 = lineTemp.closestPointToPoint( center, true, closestPointTemp );
		if ( closestPoint1.distanceTo( center ) <= radius ) return true;

		lineTemp.start = a;
		lineTemp.end = c;
		const closestPoint2 = lineTemp.closestPointToPoint( center, true, closestPointTemp );
		if ( closestPoint2.distanceTo( center ) <= radius ) return true;

		lineTemp.start = b;
		lineTemp.end = c;
		const closestPoint3 = lineTemp.closestPointToPoint( center, true, closestPointTemp );
		if ( closestPoint3.distanceTo( center ) <= radius ) return true;

		// phase 2
		const plane = triangle.getPlane( planeTemp );
		const dp = Math.abs( plane.distanceToPoint( center ) );
		if ( dp <= radius ) {

			const pp = plane.projectPoint( center, projectedPointTemp );
			const cp = triangle.containsPoint( pp );
			if ( cp ) return true;

		}

		return false;

	};

} )();

const ZERO_EPSILON = 1e-15;
function isNearZero( value ) {

	return Math.abs( value ) < ZERO_EPSILON;

}

class ExtendedTriangle extends Triangle {

	constructor( ...args ) {

		super( ...args );

		this.isExtendedTriangle = true;
		this.satAxes = new Array( 4 ).fill().map( () => new Vector3() );
		this.satBounds = new Array( 4 ).fill().map( () => new SeparatingAxisBounds() );
		this.points = [ this.a, this.b, this.c ];
		this.sphere = new Sphere();
		this.plane = new Plane();
		this.needsUpdate = true;

	}

	intersectsSphere( sphere ) {

		return sphereIntersectTriangle( sphere, this );

	}

	update() {

		const a = this.a;
		const b = this.b;
		const c = this.c;
		const points = this.points;

		const satAxes = this.satAxes;
		const satBounds = this.satBounds;

		const axis0 = satAxes[ 0 ];
		const sab0 = satBounds[ 0 ];
		this.getNormal( axis0 );
		sab0.setFromPoints( axis0, points );

		const axis1 = satAxes[ 1 ];
		const sab1 = satBounds[ 1 ];
		axis1.subVectors( a, b );
		sab1.setFromPoints( axis1, points );

		const axis2 = satAxes[ 2 ];
		const sab2 = satBounds[ 2 ];
		axis2.subVectors( b, c );
		sab2.setFromPoints( axis2, points );

		const axis3 = satAxes[ 3 ];
		const sab3 = satBounds[ 3 ];
		axis3.subVectors( c, a );
		sab3.setFromPoints( axis3, points );

		this.sphere.setFromPoints( this.points );
		this.plane.setFromNormalAndCoplanarPoint( axis0, a );
		this.needsUpdate = false;

	}

}

ExtendedTriangle.prototype.closestPointToSegment = ( function () {

	const point1 = new Vector3();
	const point2 = new Vector3();
	const edge = new Line3();

	return function distanceToSegment( segment, target1 = null, target2 = null ) {

		const { start, end } = segment;
		const points = this.points;
		let distSq;
		let closestDistanceSq = Infinity;

		// check the triangle edges
		for ( let i = 0; i < 3; i ++ ) {

			const nexti = ( i + 1 ) % 3;
			edge.start.copy( points[ i ] );
			edge.end.copy( points[ nexti ] );

			closestPointsSegmentToSegment( edge, segment, point1, point2 );

			distSq = point1.distanceToSquared( point2 );
			if ( distSq < closestDistanceSq ) {

				closestDistanceSq = distSq;
				if ( target1 ) target1.copy( point1 );
				if ( target2 ) target2.copy( point2 );

			}

		}

		// check end points
		this.closestPointToPoint( start, point1 );
		distSq = start.distanceToSquared( point1 );
		if ( distSq < closestDistanceSq ) {

			closestDistanceSq = distSq;
			if ( target1 ) target1.copy( point1 );
			if ( target2 ) target2.copy( start );

		}

		this.closestPointToPoint( end, point1 );
		distSq = end.distanceToSquared( point1 );
		if ( distSq < closestDistanceSq ) {

			closestDistanceSq = distSq;
			if ( target1 ) target1.copy( point1 );
			if ( target2 ) target2.copy( end );

		}

		return Math.sqrt( closestDistanceSq );

	};

} )();

ExtendedTriangle.prototype.intersectsTriangle = ( function () {

	const saTri2 = new ExtendedTriangle();
	const arr1 = new Array( 3 );
	const arr2 = new Array( 3 );
	const cachedSatBounds = new SeparatingAxisBounds();
	const cachedSatBounds2 = new SeparatingAxisBounds();
	const cachedAxis = new Vector3();
	const dir = new Vector3();
	const dir1 = new Vector3();
	const dir2 = new Vector3();
	const tempDir = new Vector3();
	const edge = new Line3();
	const edge1 = new Line3();
	const edge2 = new Line3();
	const tempPoint = new Vector3();

	function triIntersectPlane( tri, plane, targetEdge ) {

		// find the edge that intersects the other triangle plane
		const points = tri.points;
		let count = 0;
		let startPointIntersection = - 1;
		for ( let i = 0; i < 3; i ++ ) {

			const { start, end } = edge;
			start.copy( points[ i ] );
			end.copy( points[ ( i + 1 ) % 3 ] );
			edge.delta( dir );

			const startIntersects = isNearZero( plane.distanceToPoint( start ) );
			if ( isNearZero( plane.normal.dot( dir ) ) && startIntersects ) {

				// if the edge lies on the plane then take the line
				targetEdge.copy( edge );
				count = 2;
				break;

			}

			// check if the start point is near the plane because "intersectLine" is not robust to that case
			const doesIntersect = plane.intersectLine( edge, tempPoint );
			if ( ! doesIntersect && startIntersects ) {

				tempPoint.copy( start );

			}

			// ignore the end point
			if ( ( doesIntersect || startIntersects ) && ! isNearZero( tempPoint.distanceTo( end ) ) ) {

				if ( count <= 1 ) {

					// assign to the start or end point and save which index was snapped to
					// the start point if necessary
					const point = count === 1 ? targetEdge.start : targetEdge.end;
					point.copy( tempPoint );
					if ( startIntersects ) {

						startPointIntersection = count;

					}

				} else if ( count >= 2 ) {

					// if we're here that means that there must have been one point that had
					// snapped to the start point so replace it here
					const point = startPointIntersection === 1 ? targetEdge.start : targetEdge.end;
					point.copy( tempPoint );
					count = 2;
					break;

				}

				count ++;
				if ( count === 2 && startPointIntersection === - 1 ) {

					break;

				}

			}

		}

		return count;

	}

	// TODO: If the triangles are coplanar and intersecting the target is nonsensical. It should at least
	// be a line contained by both triangles if not a different special case somehow represented in the return result.
	return function intersectsTriangle( other, target = null, suppressLog = false ) {

		if ( this.needsUpdate ) {

			this.update();

		}

		if ( ! other.isExtendedTriangle ) {

			saTri2.copy( other );
			saTri2.update();
			other = saTri2;

		} else if ( other.needsUpdate ) {

			other.update();

		}

		const plane1 = this.plane;
		const plane2 = other.plane;

		if ( Math.abs( plane1.normal.dot( plane2.normal ) ) > 1.0 - 1e-10 ) {

			// perform separating axis intersection test only for coplanar triangles
			const satBounds1 = this.satBounds;
			const satAxes1 = this.satAxes;
			arr2[ 0 ] = other.a;
			arr2[ 1 ] = other.b;
			arr2[ 2 ] = other.c;
			for ( let i = 0; i < 4; i ++ ) {

				const sb = satBounds1[ i ];
				const sa = satAxes1[ i ];
				cachedSatBounds.setFromPoints( sa, arr2 );
				if ( sb.isSeparated( cachedSatBounds ) ) return false;

			}

			const satBounds2 = other.satBounds;
			const satAxes2 = other.satAxes;
			arr1[ 0 ] = this.a;
			arr1[ 1 ] = this.b;
			arr1[ 2 ] = this.c;
			for ( let i = 0; i < 4; i ++ ) {

				const sb = satBounds2[ i ];
				const sa = satAxes2[ i ];
				cachedSatBounds.setFromPoints( sa, arr1 );
				if ( sb.isSeparated( cachedSatBounds ) ) return false;

			}

			// check crossed axes
			for ( let i = 0; i < 4; i ++ ) {

				const sa1 = satAxes1[ i ];
				for ( let i2 = 0; i2 < 4; i2 ++ ) {

					const sa2 = satAxes2[ i2 ];
					cachedAxis.crossVectors( sa1, sa2 );
					cachedSatBounds.setFromPoints( cachedAxis, arr1 );
					cachedSatBounds2.setFromPoints( cachedAxis, arr2 );
					if ( cachedSatBounds.isSeparated( cachedSatBounds2 ) ) return false;

				}

			}

			if ( target ) {

				// TODO find two points that intersect on the edges and make that the result
				if ( ! suppressLog ) {

					console.warn( 'ExtendedTriangle.intersectsTriangle: Triangles are coplanar which does not support an output edge. Setting edge to 0, 0, 0.' );

				}

				target.start.set( 0, 0, 0 );
				target.end.set( 0, 0, 0 );

			}

			return true;

		} else {

			// find the edge that intersects the other triangle plane
			const count1 = triIntersectPlane( this, plane2, edge1 );
			if ( count1 === 1 && other.containsPoint( edge1.end ) ) {

				if ( target ) {

					target.start.copy( edge1.end );
					target.end.copy( edge1.end );

				}

				return true;

			} else if ( count1 !== 2 ) {

				return false;

			}

			// find the other triangles edge that intersects this plane
			const count2 = triIntersectPlane( other, plane1, edge2 );
			if ( count2 === 1 && this.containsPoint( edge2.end ) ) {

				if ( target ) {

					target.start.copy( edge2.end );
					target.end.copy( edge2.end );

				}

				return true;

			} else if ( count2 !== 2 ) {

				return false;

			}

			// find swap the second edge so both lines are running the same direction
			edge1.delta( dir1 );
			edge2.delta( dir2 );

			if ( dir1.dot( dir2 ) < 0 ) {

				let tmp = edge2.start;
				edge2.start = edge2.end;
				edge2.end = tmp;

			}

			// check if the edges are overlapping
			const s1 = edge1.start.dot( dir1 );
			const e1 = edge1.end.dot( dir1 );
			const s2 = edge2.start.dot( dir1 );
			const e2 = edge2.end.dot( dir1 );
			const separated1 = e1 < s2;
			const separated2 = s1 < e2;

			if ( s1 !== e2 && s2 !== e1 && separated1 === separated2 ) {

				return false;

			}

			// assign the target output
			if ( target ) {

				tempDir.subVectors( edge1.start, edge2.start );
				if ( tempDir.dot( dir1 ) > 0 ) {

					target.start.copy( edge1.start );

				} else {

					target.start.copy( edge2.start );

				}

				tempDir.subVectors( edge1.end, edge2.end );
				if ( tempDir.dot( dir1 ) < 0 ) {

					target.end.copy( edge1.end );

				} else {

					target.end.copy( edge2.end );

				}

			}

			return true;

		}

	};

} )();


ExtendedTriangle.prototype.distanceToPoint = ( function () {

	const target = new Vector3();
	return function distanceToPoint( point ) {

		this.closestPointToPoint( point, target );
		return point.distanceTo( target );

	};

} )();


ExtendedTriangle.prototype.distanceToTriangle = ( function () {

	const point = new Vector3();
	const point2 = new Vector3();
	const cornerFields = [ 'a', 'b', 'c' ];
	const line1 = new Line3();
	const line2 = new Line3();

	return function distanceToTriangle( other, target1 = null, target2 = null ) {

		const lineTarget = target1 || target2 ? line1 : null;
		if ( this.intersectsTriangle( other, lineTarget ) ) {

			if ( target1 || target2 ) {

				if ( target1 ) lineTarget.getCenter( target1 );
				if ( target2 ) lineTarget.getCenter( target2 );

			}

			return 0;

		}

		let closestDistanceSq = Infinity;

		// check all point distances
		for ( let i = 0; i < 3; i ++ ) {

			let dist;
			const field = cornerFields[ i ];
			const otherVec = other[ field ];
			this.closestPointToPoint( otherVec, point );

			dist = otherVec.distanceToSquared( point );

			if ( dist < closestDistanceSq ) {

				closestDistanceSq = dist;
				if ( target1 ) target1.copy( point );
				if ( target2 ) target2.copy( otherVec );

			}


			const thisVec = this[ field ];
			other.closestPointToPoint( thisVec, point );

			dist = thisVec.distanceToSquared( point );

			if ( dist < closestDistanceSq ) {

				closestDistanceSq = dist;
				if ( target1 ) target1.copy( thisVec );
				if ( target2 ) target2.copy( point );

			}

		}

		for ( let i = 0; i < 3; i ++ ) {

			const f11 = cornerFields[ i ];
			const f12 = cornerFields[ ( i + 1 ) % 3 ];
			line1.set( this[ f11 ], this[ f12 ] );
			for ( let i2 = 0; i2 < 3; i2 ++ ) {

				const f21 = cornerFields[ i2 ];
				const f22 = cornerFields[ ( i2 + 1 ) % 3 ];
				line2.set( other[ f21 ], other[ f22 ] );

				closestPointsSegmentToSegment( line1, line2, point, point2 );

				const dist = point.distanceToSquared( point2 );
				if ( dist < closestDistanceSq ) {

					closestDistanceSq = dist;
					if ( target1 ) target1.copy( point );
					if ( target2 ) target2.copy( point2 );

				}

			}

		}

		return Math.sqrt( closestDistanceSq );

	};

} )();

class OrientedBox {

	constructor( min, max, matrix ) {

		this.isOrientedBox = true;
		this.min = new Vector3();
		this.max = new Vector3();
		this.matrix = new Matrix4();
		this.invMatrix = new Matrix4();
		this.points = new Array( 8 ).fill().map( () => new Vector3() );
		this.satAxes = new Array( 3 ).fill().map( () => new Vector3() );
		this.satBounds = new Array( 3 ).fill().map( () => new SeparatingAxisBounds() );
		this.alignedSatBounds = new Array( 3 ).fill().map( () => new SeparatingAxisBounds() );
		this.needsUpdate = false;

		if ( min ) this.min.copy( min );
		if ( max ) this.max.copy( max );
		if ( matrix ) this.matrix.copy( matrix );

	}

	set( min, max, matrix ) {

		this.min.copy( min );
		this.max.copy( max );
		this.matrix.copy( matrix );
		this.needsUpdate = true;

	}

	copy( other ) {

		this.min.copy( other.min );
		this.max.copy( other.max );
		this.matrix.copy( other.matrix );
		this.needsUpdate = true;

	}

}

OrientedBox.prototype.update = ( function () {

	return function update() {

		const matrix = this.matrix;
		const min = this.min;
		const max = this.max;

		const points = this.points;
		for ( let x = 0; x <= 1; x ++ ) {

			for ( let y = 0; y <= 1; y ++ ) {

				for ( let z = 0; z <= 1; z ++ ) {

					const i = ( ( 1 << 0 ) * x ) | ( ( 1 << 1 ) * y ) | ( ( 1 << 2 ) * z );
					const v = points[ i ];
					v.x = x ? max.x : min.x;
					v.y = y ? max.y : min.y;
					v.z = z ? max.z : min.z;

					v.applyMatrix4( matrix );

				}

			}

		}

		const satBounds = this.satBounds;
		const satAxes = this.satAxes;
		const minVec = points[ 0 ];
		for ( let i = 0; i < 3; i ++ ) {

			const axis = satAxes[ i ];
			const sb = satBounds[ i ];
			const index = 1 << i;
			const pi = points[ index ];

			axis.subVectors( minVec, pi );
			sb.setFromPoints( axis, points );

		}

		const alignedSatBounds = this.alignedSatBounds;
		alignedSatBounds[ 0 ].setFromPointsField( points, 'x' );
		alignedSatBounds[ 1 ].setFromPointsField( points, 'y' );
		alignedSatBounds[ 2 ].setFromPointsField( points, 'z' );

		this.invMatrix.copy( this.matrix ).invert();
		this.needsUpdate = false;

	};

} )();

OrientedBox.prototype.intersectsBox = ( function () {

	const aabbBounds = new SeparatingAxisBounds();
	return function intersectsBox( box ) {

		// TODO: should this be doing SAT against the AABB?
		if ( this.needsUpdate ) {

			this.update();

		}

		const min = box.min;
		const max = box.max;
		const satBounds = this.satBounds;
		const satAxes = this.satAxes;
		const alignedSatBounds = this.alignedSatBounds;

		aabbBounds.min = min.x;
		aabbBounds.max = max.x;
		if ( alignedSatBounds[ 0 ].isSeparated( aabbBounds ) ) return false;

		aabbBounds.min = min.y;
		aabbBounds.max = max.y;
		if ( alignedSatBounds[ 1 ].isSeparated( aabbBounds ) ) return false;

		aabbBounds.min = min.z;
		aabbBounds.max = max.z;
		if ( alignedSatBounds[ 2 ].isSeparated( aabbBounds ) ) return false;

		for ( let i = 0; i < 3; i ++ ) {

			const axis = satAxes[ i ];
			const sb = satBounds[ i ];
			aabbBounds.setFromBox( axis, box );
			if ( sb.isSeparated( aabbBounds ) ) return false;

		}

		return true;

	};

} )();

OrientedBox.prototype.intersectsTriangle = ( function () {

	const saTri = new ExtendedTriangle();
	const pointsArr = new Array( 3 );
	const cachedSatBounds = new SeparatingAxisBounds();
	const cachedSatBounds2 = new SeparatingAxisBounds();
	const cachedAxis = new Vector3();
	return function intersectsTriangle( triangle ) {

		if ( this.needsUpdate ) {

			this.update();

		}

		if ( ! triangle.isExtendedTriangle ) {

			saTri.copy( triangle );
			saTri.update();
			triangle = saTri;

		} else if ( triangle.needsUpdate ) {

			triangle.update();

		}

		const satBounds = this.satBounds;
		const satAxes = this.satAxes;

		pointsArr[ 0 ] = triangle.a;
		pointsArr[ 1 ] = triangle.b;
		pointsArr[ 2 ] = triangle.c;

		for ( let i = 0; i < 3; i ++ ) {

			const sb = satBounds[ i ];
			const sa = satAxes[ i ];
			cachedSatBounds.setFromPoints( sa, pointsArr );
			if ( sb.isSeparated( cachedSatBounds ) ) return false;

		}

		const triSatBounds = triangle.satBounds;
		const triSatAxes = triangle.satAxes;
		const points = this.points;
		for ( let i = 0; i < 3; i ++ ) {

			const sb = triSatBounds[ i ];
			const sa = triSatAxes[ i ];
			cachedSatBounds.setFromPoints( sa, points );
			if ( sb.isSeparated( cachedSatBounds ) ) return false;

		}

		// check crossed axes
		for ( let i = 0; i < 3; i ++ ) {

			const sa1 = satAxes[ i ];
			for ( let i2 = 0; i2 < 4; i2 ++ ) {

				const sa2 = triSatAxes[ i2 ];
				cachedAxis.crossVectors( sa1, sa2 );
				cachedSatBounds.setFromPoints( cachedAxis, pointsArr );
				cachedSatBounds2.setFromPoints( cachedAxis, points );
				if ( cachedSatBounds.isSeparated( cachedSatBounds2 ) ) return false;

			}

		}

		return true;

	};

} )();

OrientedBox.prototype.closestPointToPoint = ( function () {

	return function closestPointToPoint( point, target1 ) {

		if ( this.needsUpdate ) {

			this.update();

		}

		target1
			.copy( point )
			.applyMatrix4( this.invMatrix )
			.clamp( this.min, this.max )
			.applyMatrix4( this.matrix );

		return target1;

	};

} )();

OrientedBox.prototype.distanceToPoint = ( function () {

	const target = new Vector3();
	return function distanceToPoint( point ) {

		this.closestPointToPoint( point, target );
		return point.distanceTo( target );

	};

} )();

OrientedBox.prototype.distanceToBox = ( function () {

	const xyzFields = [ 'x', 'y', 'z' ];
	const segments1 = new Array( 12 ).fill().map( () => new Line3() );
	const segments2 = new Array( 12 ).fill().map( () => new Line3() );

	const point1 = new Vector3();
	const point2 = new Vector3();

	// early out if we find a value below threshold
	return function distanceToBox( box, threshold = 0, target1 = null, target2 = null ) {

		if ( this.needsUpdate ) {

			this.update();

		}

		if ( this.intersectsBox( box ) ) {

			if ( target1 || target2 ) {

				box.getCenter( point2 );
				this.closestPointToPoint( point2, point1 );
				box.closestPointToPoint( point1, point2 );

				if ( target1 ) target1.copy( point1 );
				if ( target2 ) target2.copy( point2 );

			}

			return 0;

		}

		const threshold2 = threshold * threshold;
		const min = box.min;
		const max = box.max;
		const points = this.points;


		// iterate over every edge and compare distances
		let closestDistanceSq = Infinity;

		// check over all these points
		for ( let i = 0; i < 8; i ++ ) {

			const p = points[ i ];
			point2.copy( p ).clamp( min, max );

			const dist = p.distanceToSquared( point2 );
			if ( dist < closestDistanceSq ) {

				closestDistanceSq = dist;
				if ( target1 ) target1.copy( p );
				if ( target2 ) target2.copy( point2 );

				if ( dist < threshold2 ) return Math.sqrt( dist );

			}

		}

		// generate and check all line segment distances
		let count = 0;
		for ( let i = 0; i < 3; i ++ ) {

			for ( let i1 = 0; i1 <= 1; i1 ++ ) {

				for ( let i2 = 0; i2 <= 1; i2 ++ ) {

					const nextIndex = ( i + 1 ) % 3;
					const nextIndex2 = ( i + 2 ) % 3;

					// get obb line segments
					const index = i1 << nextIndex | i2 << nextIndex2;
					const index2 = 1 << i | i1 << nextIndex | i2 << nextIndex2;
					const p1 = points[ index ];
					const p2 = points[ index2 ];
					const line1 = segments1[ count ];
					line1.set( p1, p2 );


					// get aabb line segments
					const f1 = xyzFields[ i ];
					const f2 = xyzFields[ nextIndex ];
					const f3 = xyzFields[ nextIndex2 ];
					const line2 = segments2[ count ];
					const start = line2.start;
					const end = line2.end;

					start[ f1 ] = min[ f1 ];
					start[ f2 ] = i1 ? min[ f2 ] : max[ f2 ];
					start[ f3 ] = i2 ? min[ f3 ] : max[ f2 ];

					end[ f1 ] = max[ f1 ];
					end[ f2 ] = i1 ? min[ f2 ] : max[ f2 ];
					end[ f3 ] = i2 ? min[ f3 ] : max[ f2 ];

					count ++;

				}

			}

		}

		// check all the other boxes point
		for ( let x = 0; x <= 1; x ++ ) {

			for ( let y = 0; y <= 1; y ++ ) {

				for ( let z = 0; z <= 1; z ++ ) {

					point2.x = x ? max.x : min.x;
					point2.y = y ? max.y : min.y;
					point2.z = z ? max.z : min.z;

					this.closestPointToPoint( point2, point1 );
					const dist = point2.distanceToSquared( point1 );
					if ( dist < closestDistanceSq ) {

						closestDistanceSq = dist;
						if ( target1 ) target1.copy( point1 );
						if ( target2 ) target2.copy( point2 );

						if ( dist < threshold2 ) return Math.sqrt( dist );

					}

				}

			}

		}

		for ( let i = 0; i < 12; i ++ ) {

			const l1 = segments1[ i ];
			for ( let i2 = 0; i2 < 12; i2 ++ ) {

				const l2 = segments2[ i2 ];
				closestPointsSegmentToSegment( l1, l2, point1, point2 );
				const dist = point1.distanceToSquared( point2 );
				if ( dist < closestDistanceSq ) {

					closestDistanceSq = dist;
					if ( target1 ) target1.copy( point1 );
					if ( target2 ) target2.copy( point2 );

					if ( dist < threshold2 ) return Math.sqrt( dist );

				}

			}

		}

		return Math.sqrt( closestDistanceSq );

	};

} )();

class PrimitivePool {

	constructor( getNewPrimitive ) {

		this._getNewPrimitive = getNewPrimitive;
		this._primitives = [];

	}

	getPrimitive() {

		const primitives = this._primitives;
		if ( primitives.length === 0 ) {

			return this._getNewPrimitive();

		} else {

			return primitives.pop();

		}

	}

	releasePrimitive( primitive ) {

		this._primitives.push( primitive );

	}

}

class ExtendedTrianglePoolBase extends PrimitivePool {

	constructor() {

		super( () => new ExtendedTriangle() );

	}

}

const ExtendedTrianglePool = /* @__PURE__ */ new ExtendedTrianglePoolBase();

function IS_LEAF( n16, uint16Array ) {

	return uint16Array[ n16 + 15 ] === 0xFFFF;

}

function OFFSET( n32, uint32Array ) {

	return uint32Array[ n32 + 6 ];

}

function COUNT( n16, uint16Array ) {

	return uint16Array[ n16 + 14 ];

}

function LEFT_NODE( n32 ) {

	return n32 + 8;

}

function RIGHT_NODE( n32, uint32Array ) {

	return uint32Array[ n32 + 6 ];

}

function SPLIT_AXIS( n32, uint32Array ) {

	return uint32Array[ n32 + 7 ];

}

function BOUNDING_DATA_INDEX( n32 ) {

	return n32;

}

class _BufferStack {

	constructor() {

		this.float32Array = null;
		this.uint16Array = null;
		this.uint32Array = null;

		const stack = [];
		let prevBuffer = null;
		this.setBuffer = buffer => {

			if ( prevBuffer ) {

				stack.push( prevBuffer );

			}

			prevBuffer = buffer;
			this.float32Array = new Float32Array( buffer );
			this.uint16Array = new Uint16Array( buffer );
			this.uint32Array = new Uint32Array( buffer );

		};

		this.clearBuffer = () => {

			prevBuffer = null;
			this.float32Array = null;
			this.uint16Array = null;
			this.uint32Array = null;

			if ( stack.length !== 0 ) {

				this.setBuffer( stack.pop() );

			}

		};

	}

}

const BufferStack = new _BufferStack();

let _box1, _box2;
const boxStack = [];
const boxPool = /* @__PURE__ */ new PrimitivePool( () => new Box3() );

function shapecast( bvh, root, intersectsBounds, intersectsRange, boundsTraverseOrder, byteOffset ) {

	// setup
	_box1 = boxPool.getPrimitive();
	_box2 = boxPool.getPrimitive();
	boxStack.push( _box1, _box2 );
	BufferStack.setBuffer( bvh._roots[ root ] );

	const result = shapecastTraverse( 0, bvh.geometry, intersectsBounds, intersectsRange, boundsTraverseOrder, byteOffset );

	// cleanup
	BufferStack.clearBuffer();
	boxPool.releasePrimitive( _box1 );
	boxPool.releasePrimitive( _box2 );
	boxStack.pop();
	boxStack.pop();

	const length = boxStack.length;
	if ( length > 0 ) {

		_box2 = boxStack[ length - 1 ];
		_box1 = boxStack[ length - 2 ];

	}

	return result;

}

function shapecastTraverse(
	nodeIndex32,
	geometry,
	intersectsBoundsFunc,
	intersectsRangeFunc,
	nodeScoreFunc = null,
	nodeIndexByteOffset = 0, // offset for unique node identifier
	depth = 0
) {

	const { float32Array, uint16Array, uint32Array } = BufferStack;
	let nodeIndex16 = nodeIndex32 * 2;

	const isLeaf = IS_LEAF( nodeIndex16, uint16Array );
	if ( isLeaf ) {

		const offset = OFFSET( nodeIndex32, uint32Array );
		const count = COUNT( nodeIndex16, uint16Array );
		arrayToBox( BOUNDING_DATA_INDEX( nodeIndex32 ), float32Array, _box1 );
		return intersectsRangeFunc( offset, count, false, depth, nodeIndexByteOffset + nodeIndex32, _box1 );

	} else {

		const left = LEFT_NODE( nodeIndex32 );
		const right = RIGHT_NODE( nodeIndex32, uint32Array );
		let c1 = left;
		let c2 = right;

		let score1, score2;
		let box1, box2;
		if ( nodeScoreFunc ) {

			box1 = _box1;
			box2 = _box2;

			// bounding data is not offset
			arrayToBox( BOUNDING_DATA_INDEX( c1 ), float32Array, box1 );
			arrayToBox( BOUNDING_DATA_INDEX( c2 ), float32Array, box2 );

			score1 = nodeScoreFunc( box1 );
			score2 = nodeScoreFunc( box2 );

			if ( score2 < score1 ) {

				c1 = right;
				c2 = left;

				const temp = score1;
				score1 = score2;
				score2 = temp;

				box1 = box2;
				// box2 is always set before use below

			}

		}

		// Check box 1 intersection
		if ( ! box1 ) {

			box1 = _box1;
			arrayToBox( BOUNDING_DATA_INDEX( c1 ), float32Array, box1 );

		}

		const isC1Leaf = IS_LEAF( c1 * 2, uint16Array );
		const c1Intersection = intersectsBoundsFunc( box1, isC1Leaf, score1, depth + 1, nodeIndexByteOffset + c1 );

		let c1StopTraversal;
		if ( c1Intersection === CONTAINED ) {

			const offset = getLeftOffset( c1 );
			const end = getRightEndOffset( c1 );
			const count = end - offset;

			c1StopTraversal = intersectsRangeFunc( offset, count, true, depth + 1, nodeIndexByteOffset + c1, box1 );

		} else {

			c1StopTraversal =
				c1Intersection &&
				shapecastTraverse(
					c1,
					geometry,
					intersectsBoundsFunc,
					intersectsRangeFunc,
					nodeScoreFunc,
					nodeIndexByteOffset,
					depth + 1
				);

		}

		if ( c1StopTraversal ) return true;

		// Check box 2 intersection
		// cached box2 will have been overwritten by previous traversal
		box2 = _box2;
		arrayToBox( BOUNDING_DATA_INDEX( c2 ), float32Array, box2 );

		const isC2Leaf = IS_LEAF( c2 * 2, uint16Array );
		const c2Intersection = intersectsBoundsFunc( box2, isC2Leaf, score2, depth + 1, nodeIndexByteOffset + c2 );

		let c2StopTraversal;
		if ( c2Intersection === CONTAINED ) {

			const offset = getLeftOffset( c2 );
			const end = getRightEndOffset( c2 );
			const count = end - offset;

			c2StopTraversal = intersectsRangeFunc( offset, count, true, depth + 1, nodeIndexByteOffset + c2, box2 );

		} else {

			c2StopTraversal =
				c2Intersection &&
				shapecastTraverse(
					c2,
					geometry,
					intersectsBoundsFunc,
					intersectsRangeFunc,
					nodeScoreFunc,
					nodeIndexByteOffset,
					depth + 1
				);

		}

		if ( c2StopTraversal ) return true;

		return false;

		// Define these inside the function so it has access to the local variables needed
		// when converting to the buffer equivalents
		function getLeftOffset( nodeIndex32 ) {

			const { uint16Array, uint32Array } = BufferStack;
			let nodeIndex16 = nodeIndex32 * 2;

			// traverse until we find a leaf
			while ( ! IS_LEAF( nodeIndex16, uint16Array ) ) {

				nodeIndex32 = LEFT_NODE( nodeIndex32 );
				nodeIndex16 = nodeIndex32 * 2;

			}

			return OFFSET( nodeIndex32, uint32Array );

		}

		function getRightEndOffset( nodeIndex32 ) {

			const { uint16Array, uint32Array } = BufferStack;
			let nodeIndex16 = nodeIndex32 * 2;

			// traverse until we find a leaf
			while ( ! IS_LEAF( nodeIndex16, uint16Array ) ) {

				// adjust offset to point to the right node
				nodeIndex32 = RIGHT_NODE( nodeIndex32, uint32Array );
				nodeIndex16 = nodeIndex32 * 2;

			}

			// return the end offset of the triangle range
			return OFFSET( nodeIndex32, uint32Array ) + COUNT( nodeIndex16, uint16Array );

		}

	}

}

const temp = /* @__PURE__ */ new Vector3();
const temp1$2 = /* @__PURE__ */ new Vector3();

function closestPointToPoint(
	bvh,
	point,
	target = { },
	minThreshold = 0,
	maxThreshold = Infinity,
) {

	// early out if under minThreshold
	// skip checking if over maxThreshold
	// set minThreshold = maxThreshold to quickly check if a point is within a threshold
	// returns Infinity if no value found
	const minThresholdSq = minThreshold * minThreshold;
	const maxThresholdSq = maxThreshold * maxThreshold;
	let closestDistanceSq = Infinity;
	let closestDistanceTriIndex = null;
	bvh.shapecast(

		{

			boundsTraverseOrder: box => {

				temp.copy( point ).clamp( box.min, box.max );
				return temp.distanceToSquared( point );

			},

			intersectsBounds: ( box, isLeaf, score ) => {

				return score < closestDistanceSq && score < maxThresholdSq;

			},

			intersectsTriangle: ( tri, triIndex ) => {

				tri.closestPointToPoint( point, temp );
				const distSq = point.distanceToSquared( temp );
				if ( distSq < closestDistanceSq ) {

					temp1$2.copy( temp );
					closestDistanceSq = distSq;
					closestDistanceTriIndex = triIndex;

				}

				if ( distSq < minThresholdSq ) {

					return true;

				} else {

					return false;

				}

			},

		}

	);

	if ( closestDistanceSq === Infinity ) return null;

	const closestDistance = Math.sqrt( closestDistanceSq );

	if ( ! target.point ) target.point = temp1$2.clone();
	else target.point.copy( temp1$2 );
	target.distance = closestDistance,
	target.faceIndex = closestDistanceTriIndex;

	return target;

}

// Ripped and modified From THREE.js Mesh raycast
// https://github.com/mrdoob/three.js/blob/0aa87c999fe61e216c1133fba7a95772b503eddf/src/objects/Mesh.js#L115
const _vA = /* @__PURE__ */ new Vector3();
const _vB = /* @__PURE__ */ new Vector3();
const _vC = /* @__PURE__ */ new Vector3();

const _uvA = /* @__PURE__ */ new Vector2();
const _uvB = /* @__PURE__ */ new Vector2();
const _uvC = /* @__PURE__ */ new Vector2();

const _normalA = /* @__PURE__ */ new Vector3();
const _normalB = /* @__PURE__ */ new Vector3();
const _normalC = /* @__PURE__ */ new Vector3();

const _intersectionPoint = /* @__PURE__ */ new Vector3();
function checkIntersection( ray, pA, pB, pC, point, side ) {

	let intersect;
	if ( side === BackSide ) {

		intersect = ray.intersectTriangle( pC, pB, pA, true, point );

	} else {

		intersect = ray.intersectTriangle( pA, pB, pC, side !== DoubleSide, point );

	}

	if ( intersect === null ) return null;

	const distance = ray.origin.distanceTo( point );

	return {

		distance: distance,
		point: point.clone(),

	};

}

function checkBufferGeometryIntersection( ray, position, normal, uv, uv1, a, b, c, side ) {

	_vA.fromBufferAttribute( position, a );
	_vB.fromBufferAttribute( position, b );
	_vC.fromBufferAttribute( position, c );

	const intersection = checkIntersection( ray, _vA, _vB, _vC, _intersectionPoint, side );

	if ( intersection ) {

		if ( uv ) {

			_uvA.fromBufferAttribute( uv, a );
			_uvB.fromBufferAttribute( uv, b );
			_uvC.fromBufferAttribute( uv, c );

			intersection.uv = Triangle.getInterpolation( _intersectionPoint, _vA, _vB, _vC, _uvA, _uvB, _uvC, new Vector2() );

		}

		if ( uv1 ) {

			_uvA.fromBufferAttribute( uv1, a );
			_uvB.fromBufferAttribute( uv1, b );
			_uvC.fromBufferAttribute( uv1, c );

			intersection.uv1 = Triangle.getInterpolation( _intersectionPoint, _vA, _vB, _vC, _uvA, _uvB, _uvC, new Vector2() );

		}

		if ( normal ) {

			_normalA.fromBufferAttribute( normal, a );
			_normalB.fromBufferAttribute( normal, b );
			_normalC.fromBufferAttribute( normal, c );

			intersection.normal = Triangle.getInterpolation( _intersectionPoint, _vA, _vB, _vC, _normalA, _normalB, _normalC, new Vector3() );
			if ( intersection.normal.dot( ray.direction ) > 0 ) {

				intersection.normal.multiplyScalar( - 1 );

			}

		}

		const face = {
			a: a,
			b: b,
			c: c,
			normal: new Vector3(),
			materialIndex: 0
		};

		Triangle.getNormal( _vA, _vB, _vC, face.normal );

		intersection.face = face;
		intersection.faceIndex = a;

	}

	return intersection;

}

// https://github.com/mrdoob/three.js/blob/0aa87c999fe61e216c1133fba7a95772b503eddf/src/objects/Mesh.js#L258
function intersectTri( geo, side, ray, tri, intersections ) {

	const triOffset = tri * 3;
	let a = triOffset + 0;
	let b = triOffset + 1;
	let c = triOffset + 2;

	const index = geo.index;
	if ( geo.index ) {

		a = index.getX( a );
		b = index.getX( b );
		c = index.getX( c );

	}

	const { position, normal, uv, uv1 } = geo.attributes;
	const intersection = checkBufferGeometryIntersection( ray, position, normal, uv, uv1, a, b, c, side );

	if ( intersection ) {

		intersection.faceIndex = tri;
		if ( intersections ) intersections.push( intersection );
		return intersection;

	}

	return null;

}

// sets the vertices of triangle `tri` with the 3 vertices after i
function setTriangle( tri, i, index, pos ) {

	const ta = tri.a;
	const tb = tri.b;
	const tc = tri.c;

	let i0 = i;
	let i1 = i + 1;
	let i2 = i + 2;
	if ( index ) {

		i0 = index.getX( i0 );
		i1 = index.getX( i1 );
		i2 = index.getX( i2 );

	}

	ta.x = pos.getX( i0 );
	ta.y = pos.getY( i0 );
	ta.z = pos.getZ( i0 );

	tb.x = pos.getX( i1 );
	tb.y = pos.getY( i1 );
	tb.z = pos.getZ( i1 );

	tc.x = pos.getX( i2 );
	tc.y = pos.getY( i2 );
	tc.z = pos.getZ( i2 );

}

/*************************************************************/
/* This file is generated from "iterationUtils.template.js". */
/*************************************************************/
/* eslint-disable indent */

function intersectTris( bvh, side, ray, offset, count, intersections ) {

	const { geometry, _indirectBuffer } = bvh;
	for ( let i = offset, end = offset + count; i < end; i ++ ) {


		intersectTri( geometry, side, ray, i, intersections );


	}

}

function intersectClosestTri( bvh, side, ray, offset, count ) {

	const { geometry, _indirectBuffer } = bvh;
	let dist = Infinity;
	let res = null;
	for ( let i = offset, end = offset + count; i < end; i ++ ) {

		let intersection;

		intersection = intersectTri( geometry, side, ray, i );


		if ( intersection && intersection.distance < dist ) {

			res = intersection;
			dist = intersection.distance;

		}

	}

	return res;

}

function iterateOverTriangles(
	offset,
	count,
	bvh,
	intersectsTriangleFunc,
	contained,
	depth,
	triangle
) {

	const { geometry } = bvh;
	const { index } = geometry;
	const pos = geometry.attributes.position;
	for ( let i = offset, l = count + offset; i < l; i ++ ) {

		let tri;

		tri = i;

		setTriangle( triangle, tri * 3, index, pos );
		triangle.needsUpdate = true;

		if ( intersectsTriangleFunc( triangle, tri, contained, depth ) ) {

			return true;

		}

	}

	return false;

}

/****************************************************/
/* This file is generated from "refit.template.js". */
/****************************************************/

function refit( bvh, nodeIndices = null ) {

	if ( nodeIndices && Array.isArray( nodeIndices ) ) {

		nodeIndices = new Set( nodeIndices );

	}

	const geometry = bvh.geometry;
	const indexArr = geometry.index ? geometry.index.array : null;
	const posAttr = geometry.attributes.position;

	let buffer, uint32Array, uint16Array, float32Array;
	let byteOffset = 0;
	const roots = bvh._roots;
	for ( let i = 0, l = roots.length; i < l; i ++ ) {

		buffer = roots[ i ];
		uint32Array = new Uint32Array( buffer );
		uint16Array = new Uint16Array( buffer );
		float32Array = new Float32Array( buffer );

		_traverse( 0, byteOffset );
		byteOffset += buffer.byteLength;

	}

	function _traverse( node32Index, byteOffset, force = false ) {

		const node16Index = node32Index * 2;
		const isLeaf = uint16Array[ node16Index + 15 ] === IS_LEAFNODE_FLAG;
		if ( isLeaf ) {

			const offset = uint32Array[ node32Index + 6 ];
			const count = uint16Array[ node16Index + 14 ];

			let minx = Infinity;
			let miny = Infinity;
			let minz = Infinity;
			let maxx = - Infinity;
			let maxy = - Infinity;
			let maxz = - Infinity;


			for ( let i = 3 * offset, l = 3 * ( offset + count ); i < l; i ++ ) {

				let index = indexArr[ i ];
				const x = posAttr.getX( index );
				const y = posAttr.getY( index );
				const z = posAttr.getZ( index );

				if ( x < minx ) minx = x;
				if ( x > maxx ) maxx = x;

				if ( y < miny ) miny = y;
				if ( y > maxy ) maxy = y;

				if ( z < minz ) minz = z;
				if ( z > maxz ) maxz = z;

			}


			if (
				float32Array[ node32Index + 0 ] !== minx ||
				float32Array[ node32Index + 1 ] !== miny ||
				float32Array[ node32Index + 2 ] !== minz ||

				float32Array[ node32Index + 3 ] !== maxx ||
				float32Array[ node32Index + 4 ] !== maxy ||
				float32Array[ node32Index + 5 ] !== maxz
			) {

				float32Array[ node32Index + 0 ] = minx;
				float32Array[ node32Index + 1 ] = miny;
				float32Array[ node32Index + 2 ] = minz;

				float32Array[ node32Index + 3 ] = maxx;
				float32Array[ node32Index + 4 ] = maxy;
				float32Array[ node32Index + 5 ] = maxz;

				return true;

			} else {

				return false;

			}

		} else {

			const left = node32Index + 8;
			const right = uint32Array[ node32Index + 6 ];

			// the identifying node indices provided by the shapecast function include offsets of all
			// root buffers to guarantee they're unique between roots so offset left and right indices here.
			const offsetLeft = left + byteOffset;
			const offsetRight = right + byteOffset;
			let forceChildren = force;
			let includesLeft = false;
			let includesRight = false;

			if ( nodeIndices ) {

				// if we see that neither the left or right child are included in the set that need to be updated
				// then we assume that all children need to be updated.
				if ( ! forceChildren ) {

					includesLeft = nodeIndices.has( offsetLeft );
					includesRight = nodeIndices.has( offsetRight );
					forceChildren = ! includesLeft && ! includesRight;

				}

			} else {

				includesLeft = true;
				includesRight = true;

			}

			const traverseLeft = forceChildren || includesLeft;
			const traverseRight = forceChildren || includesRight;

			let leftChange = false;
			if ( traverseLeft ) {

				leftChange = _traverse( left, byteOffset, forceChildren );

			}

			let rightChange = false;
			if ( traverseRight ) {

				rightChange = _traverse( right, byteOffset, forceChildren );

			}

			const didChange = leftChange || rightChange;
			if ( didChange ) {

				for ( let i = 0; i < 3; i ++ ) {

					const lefti = left + i;
					const righti = right + i;
					const minLeftValue = float32Array[ lefti ];
					const maxLeftValue = float32Array[ lefti + 3 ];
					const minRightValue = float32Array[ righti ];
					const maxRightValue = float32Array[ righti + 3 ];

					float32Array[ node32Index + i ] = minLeftValue < minRightValue ? minLeftValue : minRightValue;
					float32Array[ node32Index + i + 3 ] = maxLeftValue > maxRightValue ? maxLeftValue : maxRightValue;

				}

			}

			return didChange;

		}

	}

}

const _boundingBox = /* @__PURE__ */ new Box3();
function intersectRay( nodeIndex32, array, ray, target ) {

	arrayToBox( nodeIndex32, array, _boundingBox );
	return ray.intersectBox( _boundingBox, target );

}

/*************************************************************/
/* This file is generated from "iterationUtils.template.js". */
/*************************************************************/
/* eslint-disable indent */

function intersectTris_indirect( bvh, side, ray, offset, count, intersections ) {

	const { geometry, _indirectBuffer } = bvh;
	for ( let i = offset, end = offset + count; i < end; i ++ ) {

		let vi = _indirectBuffer ? _indirectBuffer[ i ] : i;
		intersectTri( geometry, side, ray, vi, intersections );


	}

}

function intersectClosestTri_indirect( bvh, side, ray, offset, count ) {

	const { geometry, _indirectBuffer } = bvh;
	let dist = Infinity;
	let res = null;
	for ( let i = offset, end = offset + count; i < end; i ++ ) {

		let intersection;
		intersection = intersectTri( geometry, side, ray, _indirectBuffer ? _indirectBuffer[ i ] : i );


		if ( intersection && intersection.distance < dist ) {

			res = intersection;
			dist = intersection.distance;

		}

	}

	return res;

}

function iterateOverTriangles_indirect(
	offset,
	count,
	bvh,
	intersectsTriangleFunc,
	contained,
	depth,
	triangle
) {

	const { geometry } = bvh;
	const { index } = geometry;
	const pos = geometry.attributes.position;
	for ( let i = offset, l = count + offset; i < l; i ++ ) {

		let tri;
		tri = bvh.resolveTriangleIndex( i );

		setTriangle( triangle, tri * 3, index, pos );
		triangle.needsUpdate = true;

		if ( intersectsTriangleFunc( triangle, tri, contained, depth ) ) {

			return true;

		}

	}

	return false;

}

/******************************************************/
/* This file is generated from "raycast.template.js". */
/******************************************************/

const _boxIntersection$3 = /* @__PURE__ */ new Vector3();
function raycast( bvh, root, side, ray, intersects ) {

	BufferStack.setBuffer( bvh._roots[ root ] );
	_raycast$1( 0, bvh, side, ray, intersects );
	BufferStack.clearBuffer();

}

function _raycast$1( nodeIndex32, bvh, side, ray, intersects ) {

	const { float32Array, uint16Array, uint32Array } = BufferStack;
	const nodeIndex16 = nodeIndex32 * 2;
	const isLeaf = IS_LEAF( nodeIndex16, uint16Array );
	if ( isLeaf ) {

		const offset = OFFSET( nodeIndex32, uint32Array );
		const count = COUNT( nodeIndex16, uint16Array );


		intersectTris( bvh, side, ray, offset, count, intersects );


	} else {

		const leftIndex = LEFT_NODE( nodeIndex32 );
		if ( intersectRay( leftIndex, float32Array, ray, _boxIntersection$3 ) ) {

			_raycast$1( leftIndex, bvh, side, ray, intersects );

		}

		const rightIndex = RIGHT_NODE( nodeIndex32, uint32Array );
		if ( intersectRay( rightIndex, float32Array, ray, _boxIntersection$3 ) ) {

			_raycast$1( rightIndex, bvh, side, ray, intersects );

		}

	}

}

/***********************************************************/
/* This file is generated from "raycastFirst.template.js". */
/***********************************************************/
const _boxIntersection$2 = /* @__PURE__ */ new Vector3();
const _xyzFields$1 = [ 'x', 'y', 'z' ];
function raycastFirst( bvh, root, side, ray ) {

	BufferStack.setBuffer( bvh._roots[ root ] );
	const result = _raycastFirst$1( 0, bvh, side, ray );
	BufferStack.clearBuffer();

	return result;

}

function _raycastFirst$1( nodeIndex32, bvh, side, ray ) {

	const { float32Array, uint16Array, uint32Array } = BufferStack;
	let nodeIndex16 = nodeIndex32 * 2;

	const isLeaf = IS_LEAF( nodeIndex16, uint16Array );
	if ( isLeaf ) {

		const offset = OFFSET( nodeIndex32, uint32Array );
		const count = COUNT( nodeIndex16, uint16Array );


		return intersectClosestTri( bvh, side, ray, offset, count );


	} else {

		// consider the position of the split plane with respect to the oncoming ray; whichever direction
		// the ray is coming from, look for an intersection among that side of the tree first
		const splitAxis = SPLIT_AXIS( nodeIndex32, uint32Array );
		const xyzAxis = _xyzFields$1[ splitAxis ];
		const rayDir = ray.direction[ xyzAxis ];
		const leftToRight = rayDir >= 0;

		// c1 is the child to check first
		let c1, c2;
		if ( leftToRight ) {

			c1 = LEFT_NODE( nodeIndex32 );
			c2 = RIGHT_NODE( nodeIndex32, uint32Array );

		} else {

			c1 = RIGHT_NODE( nodeIndex32, uint32Array );
			c2 = LEFT_NODE( nodeIndex32 );

		}

		const c1Intersection = intersectRay( c1, float32Array, ray, _boxIntersection$2 );
		const c1Result = c1Intersection ? _raycastFirst$1( c1, bvh, side, ray ) : null;

		// if we got an intersection in the first node and it's closer than the second node's bounding
		// box, we don't need to consider the second node because it couldn't possibly be a better result
		if ( c1Result ) {

			// check if the point is within the second bounds
			// "point" is in the local frame of the bvh
			const point = c1Result.point[ xyzAxis ];
			const isOutside = leftToRight ?
				point <= float32Array[ c2 + splitAxis ] : // min bounding data
				point >= float32Array[ c2 + splitAxis + 3 ]; // max bounding data

			if ( isOutside ) {

				return c1Result;

			}

		}

		// either there was no intersection in the first node, or there could still be a closer
		// intersection in the second, so check the second node and then take the better of the two
		const c2Intersection = intersectRay( c2, float32Array, ray, _boxIntersection$2 );
		const c2Result = c2Intersection ? _raycastFirst$1( c2, bvh, side, ray ) : null;

		if ( c1Result && c2Result ) {

			return c1Result.distance <= c2Result.distance ? c1Result : c2Result;

		} else {

			return c1Result || c2Result || null;

		}

	}

}

/*****************************************************************/
/* This file is generated from "intersectsGeometry.template.js". */
/*****************************************************************/
/* eslint-disable indent */

const boundingBox$1 = /* @__PURE__ */ new Box3();
const triangle$1 = /* @__PURE__ */ new ExtendedTriangle();
const triangle2$1 = /* @__PURE__ */ new ExtendedTriangle();
const invertedMat$1 = /* @__PURE__ */ new Matrix4();

const obb$4 = /* @__PURE__ */ new OrientedBox();
const obb2$3 = /* @__PURE__ */ new OrientedBox();

function intersectsGeometry( bvh, root, otherGeometry, geometryToBvh ) {

	BufferStack.setBuffer( bvh._roots[ root ] );
	const result = _intersectsGeometry$1( 0, bvh, otherGeometry, geometryToBvh );
	BufferStack.clearBuffer();

	return result;

}

function _intersectsGeometry$1( nodeIndex32, bvh, otherGeometry, geometryToBvh, cachedObb = null ) {

	const { float32Array, uint16Array, uint32Array } = BufferStack;
	let nodeIndex16 = nodeIndex32 * 2;

	if ( cachedObb === null ) {

		if ( ! otherGeometry.boundingBox ) {

			otherGeometry.computeBoundingBox();

		}

		obb$4.set( otherGeometry.boundingBox.min, otherGeometry.boundingBox.max, geometryToBvh );
		cachedObb = obb$4;

	}

	const isLeaf = IS_LEAF( nodeIndex16, uint16Array );
	if ( isLeaf ) {

		const thisGeometry = bvh.geometry;
		const thisIndex = thisGeometry.index;
		const thisPos = thisGeometry.attributes.position;

		const index = otherGeometry.index;
		const pos = otherGeometry.attributes.position;

		const offset = OFFSET( nodeIndex32, uint32Array );
		const count = COUNT( nodeIndex16, uint16Array );

		// get the inverse of the geometry matrix so we can transform our triangles into the
		// geometry space we're trying to test. We assume there are fewer triangles being checked
		// here.
		invertedMat$1.copy( geometryToBvh ).invert();

		if ( otherGeometry.boundsTree ) {

			// if there's a bounds tree
			arrayToBox( BOUNDING_DATA_INDEX( nodeIndex32 ), float32Array, obb2$3 );
			obb2$3.matrix.copy( invertedMat$1 );
			obb2$3.needsUpdate = true;

			// TODO: use a triangle iteration function here
			const res = otherGeometry.boundsTree.shapecast( {

				intersectsBounds: box => obb2$3.intersectsBox( box ),

				intersectsTriangle: tri => {

					tri.a.applyMatrix4( geometryToBvh );
					tri.b.applyMatrix4( geometryToBvh );
					tri.c.applyMatrix4( geometryToBvh );
					tri.needsUpdate = true;


					for ( let i = offset * 3, l = ( count + offset ) * 3; i < l; i += 3 ) {

						// this triangle needs to be transformed into the current BVH coordinate frame
						setTriangle( triangle2$1, i, thisIndex, thisPos );
						triangle2$1.needsUpdate = true;
						if ( tri.intersectsTriangle( triangle2$1 ) ) {

							return true;

						}

					}


					return false;

				}

			} );

			return res;

		} else {

			// if we're just dealing with raw geometry

			for ( let i = offset * 3, l = ( count + offset ) * 3; i < l; i += 3 ) {

				// this triangle needs to be transformed into the current BVH coordinate frame
				setTriangle( triangle$1, i, thisIndex, thisPos );


				triangle$1.a.applyMatrix4( invertedMat$1 );
				triangle$1.b.applyMatrix4( invertedMat$1 );
				triangle$1.c.applyMatrix4( invertedMat$1 );
				triangle$1.needsUpdate = true;

				for ( let i2 = 0, l2 = index.count; i2 < l2; i2 += 3 ) {

					setTriangle( triangle2$1, i2, index, pos );
					triangle2$1.needsUpdate = true;

					if ( triangle$1.intersectsTriangle( triangle2$1 ) ) {

						return true;

					}

				}


			}


		}

	} else {

		const left = nodeIndex32 + 8;
		const right = uint32Array[ nodeIndex32 + 6 ];

		arrayToBox( BOUNDING_DATA_INDEX( left ), float32Array, boundingBox$1 );
		const leftIntersection =
			cachedObb.intersectsBox( boundingBox$1 ) &&
			_intersectsGeometry$1( left, bvh, otherGeometry, geometryToBvh, cachedObb );

		if ( leftIntersection ) return true;

		arrayToBox( BOUNDING_DATA_INDEX( right ), float32Array, boundingBox$1 );
		const rightIntersection =
			cachedObb.intersectsBox( boundingBox$1 ) &&
			_intersectsGeometry$1( right, bvh, otherGeometry, geometryToBvh, cachedObb );

		if ( rightIntersection ) return true;

		return false;

	}

}

/*********************************************************************/
/* This file is generated from "closestPointToGeometry.template.js". */
/*********************************************************************/

const tempMatrix$1 = /* @__PURE__ */ new Matrix4();
const obb$3 = /* @__PURE__ */ new OrientedBox();
const obb2$2 = /* @__PURE__ */ new OrientedBox();
const temp1$1 = /* @__PURE__ */ new Vector3();
const temp2$1 = /* @__PURE__ */ new Vector3();
const temp3$1 = /* @__PURE__ */ new Vector3();
const temp4$1 = /* @__PURE__ */ new Vector3();

function closestPointToGeometry(
	bvh,
	otherGeometry,
	geometryToBvh,
	target1 = { },
	target2 = { },
	minThreshold = 0,
	maxThreshold = Infinity,
) {

	if ( ! otherGeometry.boundingBox ) {

		otherGeometry.computeBoundingBox();

	}

	obb$3.set( otherGeometry.boundingBox.min, otherGeometry.boundingBox.max, geometryToBvh );
	obb$3.needsUpdate = true;

	const geometry = bvh.geometry;
	const pos = geometry.attributes.position;
	const index = geometry.index;
	const otherPos = otherGeometry.attributes.position;
	const otherIndex = otherGeometry.index;
	const triangle = ExtendedTrianglePool.getPrimitive();
	const triangle2 = ExtendedTrianglePool.getPrimitive();

	let tempTarget1 = temp1$1;
	let tempTargetDest1 = temp2$1;
	let tempTarget2 = null;
	let tempTargetDest2 = null;

	if ( target2 ) {

		tempTarget2 = temp3$1;
		tempTargetDest2 = temp4$1;

	}

	let closestDistance = Infinity;
	let closestDistanceTriIndex = null;
	let closestDistanceOtherTriIndex = null;
	tempMatrix$1.copy( geometryToBvh ).invert();
	obb2$2.matrix.copy( tempMatrix$1 );
	bvh.shapecast(
		{

			boundsTraverseOrder: box => {

				return obb$3.distanceToBox( box );

			},

			intersectsBounds: ( box, isLeaf, score ) => {

				if ( score < closestDistance && score < maxThreshold ) {

					// if we know the triangles of this bounds will be intersected next then
					// save the bounds to use during triangle checks.
					if ( isLeaf ) {

						obb2$2.min.copy( box.min );
						obb2$2.max.copy( box.max );
						obb2$2.needsUpdate = true;

					}

					return true;

				}

				return false;

			},

			intersectsRange: ( offset, count ) => {

				if ( otherGeometry.boundsTree ) {

					// if the other geometry has a bvh then use the accelerated path where we use shapecast to find
					// the closest bounds in the other geometry to check.
					const otherBvh = otherGeometry.boundsTree;
					return otherBvh.shapecast( {
						boundsTraverseOrder: box => {

							return obb2$2.distanceToBox( box );

						},

						intersectsBounds: ( box, isLeaf, score ) => {

							return score < closestDistance && score < maxThreshold;

						},

						intersectsRange: ( otherOffset, otherCount ) => {

							for ( let i2 = otherOffset, l2 = otherOffset + otherCount; i2 < l2; i2 ++ ) {


								setTriangle( triangle2, 3 * i2, otherIndex, otherPos );

								triangle2.a.applyMatrix4( geometryToBvh );
								triangle2.b.applyMatrix4( geometryToBvh );
								triangle2.c.applyMatrix4( geometryToBvh );
								triangle2.needsUpdate = true;

								for ( let i = offset, l = offset + count; i < l; i ++ ) {


									setTriangle( triangle, 3 * i, index, pos );

									triangle.needsUpdate = true;

									const dist = triangle.distanceToTriangle( triangle2, tempTarget1, tempTarget2 );
									if ( dist < closestDistance ) {

										tempTargetDest1.copy( tempTarget1 );

										if ( tempTargetDest2 ) {

											tempTargetDest2.copy( tempTarget2 );

										}

										closestDistance = dist;
										closestDistanceTriIndex = i;
										closestDistanceOtherTriIndex = i2;

									}

									// stop traversal if we find a point that's under the given threshold
									if ( dist < minThreshold ) {

										return true;

									}

								}

							}

						},
					} );

				} else {

					// If no bounds tree then we'll just check every triangle.
					const triCount = getTriCount( otherGeometry );
					for ( let i2 = 0, l2 = triCount; i2 < l2; i2 ++ ) {

						setTriangle( triangle2, 3 * i2, otherIndex, otherPos );
						triangle2.a.applyMatrix4( geometryToBvh );
						triangle2.b.applyMatrix4( geometryToBvh );
						triangle2.c.applyMatrix4( geometryToBvh );
						triangle2.needsUpdate = true;

						for ( let i = offset, l = offset + count; i < l; i ++ ) {


							setTriangle( triangle, 3 * i, index, pos );

							triangle.needsUpdate = true;

							const dist = triangle.distanceToTriangle( triangle2, tempTarget1, tempTarget2 );
							if ( dist < closestDistance ) {

								tempTargetDest1.copy( tempTarget1 );

								if ( tempTargetDest2 ) {

									tempTargetDest2.copy( tempTarget2 );

								}

								closestDistance = dist;
								closestDistanceTriIndex = i;
								closestDistanceOtherTriIndex = i2;

							}

							// stop traversal if we find a point that's under the given threshold
							if ( dist < minThreshold ) {

								return true;

							}

						}

					}

				}

			},

		}

	);

	ExtendedTrianglePool.releasePrimitive( triangle );
	ExtendedTrianglePool.releasePrimitive( triangle2 );

	if ( closestDistance === Infinity ) {

		return null;

	}

	if ( ! target1.point ) {

		target1.point = tempTargetDest1.clone();

	} else {

		target1.point.copy( tempTargetDest1 );

	}

	target1.distance = closestDistance,
	target1.faceIndex = closestDistanceTriIndex;

	if ( target2 ) {

		if ( ! target2.point ) target2.point = tempTargetDest2.clone();
		else target2.point.copy( tempTargetDest2 );
		target2.point.applyMatrix4( tempMatrix$1 );
		tempTargetDest1.applyMatrix4( tempMatrix$1 );
		target2.distance = tempTargetDest1.sub( target2.point ).length();
		target2.faceIndex = closestDistanceOtherTriIndex;

	}

	return target1;

}

/****************************************************/
/* This file is generated from "refit.template.js". */
/****************************************************/

function refit_indirect( bvh, nodeIndices = null ) {

	if ( nodeIndices && Array.isArray( nodeIndices ) ) {

		nodeIndices = new Set( nodeIndices );

	}

	const geometry = bvh.geometry;
	const indexArr = geometry.index ? geometry.index.array : null;
	const posAttr = geometry.attributes.position;

	let buffer, uint32Array, uint16Array, float32Array;
	let byteOffset = 0;
	const roots = bvh._roots;
	for ( let i = 0, l = roots.length; i < l; i ++ ) {

		buffer = roots[ i ];
		uint32Array = new Uint32Array( buffer );
		uint16Array = new Uint16Array( buffer );
		float32Array = new Float32Array( buffer );

		_traverse( 0, byteOffset );
		byteOffset += buffer.byteLength;

	}

	function _traverse( node32Index, byteOffset, force = false ) {

		const node16Index = node32Index * 2;
		const isLeaf = uint16Array[ node16Index + 15 ] === IS_LEAFNODE_FLAG;
		if ( isLeaf ) {

			const offset = uint32Array[ node32Index + 6 ];
			const count = uint16Array[ node16Index + 14 ];

			let minx = Infinity;
			let miny = Infinity;
			let minz = Infinity;
			let maxx = - Infinity;
			let maxy = - Infinity;
			let maxz = - Infinity;

			for ( let i = offset, l = offset + count; i < l; i ++ ) {

				const t = 3 * bvh.resolveTriangleIndex( i );
				for ( let j = 0; j < 3; j ++ ) {

					let index = t + j;
					index = indexArr ? indexArr[ index ] : index;

					const x = posAttr.getX( index );
					const y = posAttr.getY( index );
					const z = posAttr.getZ( index );

					if ( x < minx ) minx = x;
					if ( x > maxx ) maxx = x;

					if ( y < miny ) miny = y;
					if ( y > maxy ) maxy = y;

					if ( z < minz ) minz = z;
					if ( z > maxz ) maxz = z;


				}

			}


			if (
				float32Array[ node32Index + 0 ] !== minx ||
				float32Array[ node32Index + 1 ] !== miny ||
				float32Array[ node32Index + 2 ] !== minz ||

				float32Array[ node32Index + 3 ] !== maxx ||
				float32Array[ node32Index + 4 ] !== maxy ||
				float32Array[ node32Index + 5 ] !== maxz
			) {

				float32Array[ node32Index + 0 ] = minx;
				float32Array[ node32Index + 1 ] = miny;
				float32Array[ node32Index + 2 ] = minz;

				float32Array[ node32Index + 3 ] = maxx;
				float32Array[ node32Index + 4 ] = maxy;
				float32Array[ node32Index + 5 ] = maxz;

				return true;

			} else {

				return false;

			}

		} else {

			const left = node32Index + 8;
			const right = uint32Array[ node32Index + 6 ];

			// the identifying node indices provided by the shapecast function include offsets of all
			// root buffers to guarantee they're unique between roots so offset left and right indices here.
			const offsetLeft = left + byteOffset;
			const offsetRight = right + byteOffset;
			let forceChildren = force;
			let includesLeft = false;
			let includesRight = false;

			if ( nodeIndices ) {

				// if we see that neither the left or right child are included in the set that need to be updated
				// then we assume that all children need to be updated.
				if ( ! forceChildren ) {

					includesLeft = nodeIndices.has( offsetLeft );
					includesRight = nodeIndices.has( offsetRight );
					forceChildren = ! includesLeft && ! includesRight;

				}

			} else {

				includesLeft = true;
				includesRight = true;

			}

			const traverseLeft = forceChildren || includesLeft;
			const traverseRight = forceChildren || includesRight;

			let leftChange = false;
			if ( traverseLeft ) {

				leftChange = _traverse( left, byteOffset, forceChildren );

			}

			let rightChange = false;
			if ( traverseRight ) {

				rightChange = _traverse( right, byteOffset, forceChildren );

			}

			const didChange = leftChange || rightChange;
			if ( didChange ) {

				for ( let i = 0; i < 3; i ++ ) {

					const lefti = left + i;
					const righti = right + i;
					const minLeftValue = float32Array[ lefti ];
					const maxLeftValue = float32Array[ lefti + 3 ];
					const minRightValue = float32Array[ righti ];
					const maxRightValue = float32Array[ righti + 3 ];

					float32Array[ node32Index + i ] = minLeftValue < minRightValue ? minLeftValue : minRightValue;
					float32Array[ node32Index + i + 3 ] = maxLeftValue > maxRightValue ? maxLeftValue : maxRightValue;

				}

			}

			return didChange;

		}

	}

}

/******************************************************/
/* This file is generated from "raycast.template.js". */
/******************************************************/

const _boxIntersection$1 = /* @__PURE__ */ new Vector3();
function raycast_indirect( bvh, root, side, ray, intersects ) {

	BufferStack.setBuffer( bvh._roots[ root ] );
	_raycast( 0, bvh, side, ray, intersects );
	BufferStack.clearBuffer();

}

function _raycast( nodeIndex32, bvh, side, ray, intersects ) {

	const { float32Array, uint16Array, uint32Array } = BufferStack;
	const nodeIndex16 = nodeIndex32 * 2;
	const isLeaf = IS_LEAF( nodeIndex16, uint16Array );
	if ( isLeaf ) {

		const offset = OFFSET( nodeIndex32, uint32Array );
		const count = COUNT( nodeIndex16, uint16Array );

		intersectTris_indirect( bvh, side, ray, offset, count, intersects );


	} else {

		const leftIndex = LEFT_NODE( nodeIndex32 );
		if ( intersectRay( leftIndex, float32Array, ray, _boxIntersection$1 ) ) {

			_raycast( leftIndex, bvh, side, ray, intersects );

		}

		const rightIndex = RIGHT_NODE( nodeIndex32, uint32Array );
		if ( intersectRay( rightIndex, float32Array, ray, _boxIntersection$1 ) ) {

			_raycast( rightIndex, bvh, side, ray, intersects );

		}

	}

}

/***********************************************************/
/* This file is generated from "raycastFirst.template.js". */
/***********************************************************/
const _boxIntersection = /* @__PURE__ */ new Vector3();
const _xyzFields = [ 'x', 'y', 'z' ];
function raycastFirst_indirect( bvh, root, side, ray ) {

	BufferStack.setBuffer( bvh._roots[ root ] );
	const result = _raycastFirst( 0, bvh, side, ray );
	BufferStack.clearBuffer();

	return result;

}

function _raycastFirst( nodeIndex32, bvh, side, ray ) {

	const { float32Array, uint16Array, uint32Array } = BufferStack;
	let nodeIndex16 = nodeIndex32 * 2;

	const isLeaf = IS_LEAF( nodeIndex16, uint16Array );
	if ( isLeaf ) {

		const offset = OFFSET( nodeIndex32, uint32Array );
		const count = COUNT( nodeIndex16, uint16Array );

		return intersectClosestTri_indirect( bvh, side, ray, offset, count );


	} else {

		// consider the position of the split plane with respect to the oncoming ray; whichever direction
		// the ray is coming from, look for an intersection among that side of the tree first
		const splitAxis = SPLIT_AXIS( nodeIndex32, uint32Array );
		const xyzAxis = _xyzFields[ splitAxis ];
		const rayDir = ray.direction[ xyzAxis ];
		const leftToRight = rayDir >= 0;

		// c1 is the child to check first
		let c1, c2;
		if ( leftToRight ) {

			c1 = LEFT_NODE( nodeIndex32 );
			c2 = RIGHT_NODE( nodeIndex32, uint32Array );

		} else {

			c1 = RIGHT_NODE( nodeIndex32, uint32Array );
			c2 = LEFT_NODE( nodeIndex32 );

		}

		const c1Intersection = intersectRay( c1, float32Array, ray, _boxIntersection );
		const c1Result = c1Intersection ? _raycastFirst( c1, bvh, side, ray ) : null;

		// if we got an intersection in the first node and it's closer than the second node's bounding
		// box, we don't need to consider the second node because it couldn't possibly be a better result
		if ( c1Result ) {

			// check if the point is within the second bounds
			// "point" is in the local frame of the bvh
			const point = c1Result.point[ xyzAxis ];
			const isOutside = leftToRight ?
				point <= float32Array[ c2 + splitAxis ] : // min bounding data
				point >= float32Array[ c2 + splitAxis + 3 ]; // max bounding data

			if ( isOutside ) {

				return c1Result;

			}

		}

		// either there was no intersection in the first node, or there could still be a closer
		// intersection in the second, so check the second node and then take the better of the two
		const c2Intersection = intersectRay( c2, float32Array, ray, _boxIntersection );
		const c2Result = c2Intersection ? _raycastFirst( c2, bvh, side, ray ) : null;

		if ( c1Result && c2Result ) {

			return c1Result.distance <= c2Result.distance ? c1Result : c2Result;

		} else {

			return c1Result || c2Result || null;

		}

	}

}

/*****************************************************************/
/* This file is generated from "intersectsGeometry.template.js". */
/*****************************************************************/
/* eslint-disable indent */

const boundingBox = /* @__PURE__ */ new Box3();
const triangle = /* @__PURE__ */ new ExtendedTriangle();
const triangle2 = /* @__PURE__ */ new ExtendedTriangle();
const invertedMat = /* @__PURE__ */ new Matrix4();

const obb$2 = /* @__PURE__ */ new OrientedBox();
const obb2$1 = /* @__PURE__ */ new OrientedBox();

function intersectsGeometry_indirect( bvh, root, otherGeometry, geometryToBvh ) {

	BufferStack.setBuffer( bvh._roots[ root ] );
	const result = _intersectsGeometry( 0, bvh, otherGeometry, geometryToBvh );
	BufferStack.clearBuffer();

	return result;

}

function _intersectsGeometry( nodeIndex32, bvh, otherGeometry, geometryToBvh, cachedObb = null ) {

	const { float32Array, uint16Array, uint32Array } = BufferStack;
	let nodeIndex16 = nodeIndex32 * 2;

	if ( cachedObb === null ) {

		if ( ! otherGeometry.boundingBox ) {

			otherGeometry.computeBoundingBox();

		}

		obb$2.set( otherGeometry.boundingBox.min, otherGeometry.boundingBox.max, geometryToBvh );
		cachedObb = obb$2;

	}

	const isLeaf = IS_LEAF( nodeIndex16, uint16Array );
	if ( isLeaf ) {

		const thisGeometry = bvh.geometry;
		const thisIndex = thisGeometry.index;
		const thisPos = thisGeometry.attributes.position;

		const index = otherGeometry.index;
		const pos = otherGeometry.attributes.position;

		const offset = OFFSET( nodeIndex32, uint32Array );
		const count = COUNT( nodeIndex16, uint16Array );

		// get the inverse of the geometry matrix so we can transform our triangles into the
		// geometry space we're trying to test. We assume there are fewer triangles being checked
		// here.
		invertedMat.copy( geometryToBvh ).invert();

		if ( otherGeometry.boundsTree ) {

			// if there's a bounds tree
			arrayToBox( BOUNDING_DATA_INDEX( nodeIndex32 ), float32Array, obb2$1 );
			obb2$1.matrix.copy( invertedMat );
			obb2$1.needsUpdate = true;

			// TODO: use a triangle iteration function here
			const res = otherGeometry.boundsTree.shapecast( {

				intersectsBounds: box => obb2$1.intersectsBox( box ),

				intersectsTriangle: tri => {

					tri.a.applyMatrix4( geometryToBvh );
					tri.b.applyMatrix4( geometryToBvh );
					tri.c.applyMatrix4( geometryToBvh );
					tri.needsUpdate = true;

					for ( let i = offset, l = count + offset; i < l; i ++ ) {

						// this triangle needs to be transformed into the current BVH coordinate frame
						setTriangle( triangle2, 3 * bvh.resolveTriangleIndex( i ), thisIndex, thisPos );
						triangle2.needsUpdate = true;
						if ( tri.intersectsTriangle( triangle2 ) ) {

							return true;

						}

					}


					return false;

				}

			} );

			return res;

		} else {

			// if we're just dealing with raw geometry
			for ( let i = offset, l = count + offset; i < l; i ++ ) {

				// this triangle needs to be transformed into the current BVH coordinate frame
				const ti = bvh.resolveTriangleIndex( i );
				setTriangle( triangle, 3 * ti, thisIndex, thisPos );


				triangle.a.applyMatrix4( invertedMat );
				triangle.b.applyMatrix4( invertedMat );
				triangle.c.applyMatrix4( invertedMat );
				triangle.needsUpdate = true;

				for ( let i2 = 0, l2 = index.count; i2 < l2; i2 += 3 ) {

					setTriangle( triangle2, i2, index, pos );
					triangle2.needsUpdate = true;

					if ( triangle.intersectsTriangle( triangle2 ) ) {

						return true;

					}

				}

			}


		}

	} else {

		const left = nodeIndex32 + 8;
		const right = uint32Array[ nodeIndex32 + 6 ];

		arrayToBox( BOUNDING_DATA_INDEX( left ), float32Array, boundingBox );
		const leftIntersection =
			cachedObb.intersectsBox( boundingBox ) &&
			_intersectsGeometry( left, bvh, otherGeometry, geometryToBvh, cachedObb );

		if ( leftIntersection ) return true;

		arrayToBox( BOUNDING_DATA_INDEX( right ), float32Array, boundingBox );
		const rightIntersection =
			cachedObb.intersectsBox( boundingBox ) &&
			_intersectsGeometry( right, bvh, otherGeometry, geometryToBvh, cachedObb );

		if ( rightIntersection ) return true;

		return false;

	}

}

/*********************************************************************/
/* This file is generated from "closestPointToGeometry.template.js". */
/*********************************************************************/

const tempMatrix = /* @__PURE__ */ new Matrix4();
const obb$1 = /* @__PURE__ */ new OrientedBox();
const obb2 = /* @__PURE__ */ new OrientedBox();
const temp1 = /* @__PURE__ */ new Vector3();
const temp2 = /* @__PURE__ */ new Vector3();
const temp3 = /* @__PURE__ */ new Vector3();
const temp4 = /* @__PURE__ */ new Vector3();

function closestPointToGeometry_indirect(
	bvh,
	otherGeometry,
	geometryToBvh,
	target1 = { },
	target2 = { },
	minThreshold = 0,
	maxThreshold = Infinity,
) {

	if ( ! otherGeometry.boundingBox ) {

		otherGeometry.computeBoundingBox();

	}

	obb$1.set( otherGeometry.boundingBox.min, otherGeometry.boundingBox.max, geometryToBvh );
	obb$1.needsUpdate = true;

	const geometry = bvh.geometry;
	const pos = geometry.attributes.position;
	const index = geometry.index;
	const otherPos = otherGeometry.attributes.position;
	const otherIndex = otherGeometry.index;
	const triangle = ExtendedTrianglePool.getPrimitive();
	const triangle2 = ExtendedTrianglePool.getPrimitive();

	let tempTarget1 = temp1;
	let tempTargetDest1 = temp2;
	let tempTarget2 = null;
	let tempTargetDest2 = null;

	if ( target2 ) {

		tempTarget2 = temp3;
		tempTargetDest2 = temp4;

	}

	let closestDistance = Infinity;
	let closestDistanceTriIndex = null;
	let closestDistanceOtherTriIndex = null;
	tempMatrix.copy( geometryToBvh ).invert();
	obb2.matrix.copy( tempMatrix );
	bvh.shapecast(
		{

			boundsTraverseOrder: box => {

				return obb$1.distanceToBox( box );

			},

			intersectsBounds: ( box, isLeaf, score ) => {

				if ( score < closestDistance && score < maxThreshold ) {

					// if we know the triangles of this bounds will be intersected next then
					// save the bounds to use during triangle checks.
					if ( isLeaf ) {

						obb2.min.copy( box.min );
						obb2.max.copy( box.max );
						obb2.needsUpdate = true;

					}

					return true;

				}

				return false;

			},

			intersectsRange: ( offset, count ) => {

				if ( otherGeometry.boundsTree ) {

					// if the other geometry has a bvh then use the accelerated path where we use shapecast to find
					// the closest bounds in the other geometry to check.
					const otherBvh = otherGeometry.boundsTree;
					return otherBvh.shapecast( {
						boundsTraverseOrder: box => {

							return obb2.distanceToBox( box );

						},

						intersectsBounds: ( box, isLeaf, score ) => {

							return score < closestDistance && score < maxThreshold;

						},

						intersectsRange: ( otherOffset, otherCount ) => {

							for ( let i2 = otherOffset, l2 = otherOffset + otherCount; i2 < l2; i2 ++ ) {

								const ti2 = otherBvh.resolveTriangleIndex( i2 );
								setTriangle( triangle2, 3 * ti2, otherIndex, otherPos );

								triangle2.a.applyMatrix4( geometryToBvh );
								triangle2.b.applyMatrix4( geometryToBvh );
								triangle2.c.applyMatrix4( geometryToBvh );
								triangle2.needsUpdate = true;

								for ( let i = offset, l = offset + count; i < l; i ++ ) {

									const ti = bvh.resolveTriangleIndex( i );
									setTriangle( triangle, 3 * ti, index, pos );

									triangle.needsUpdate = true;

									const dist = triangle.distanceToTriangle( triangle2, tempTarget1, tempTarget2 );
									if ( dist < closestDistance ) {

										tempTargetDest1.copy( tempTarget1 );

										if ( tempTargetDest2 ) {

											tempTargetDest2.copy( tempTarget2 );

										}

										closestDistance = dist;
										closestDistanceTriIndex = i;
										closestDistanceOtherTriIndex = i2;

									}

									// stop traversal if we find a point that's under the given threshold
									if ( dist < minThreshold ) {

										return true;

									}

								}

							}

						},
					} );

				} else {

					// If no bounds tree then we'll just check every triangle.
					const triCount = getTriCount( otherGeometry );
					for ( let i2 = 0, l2 = triCount; i2 < l2; i2 ++ ) {

						setTriangle( triangle2, 3 * i2, otherIndex, otherPos );
						triangle2.a.applyMatrix4( geometryToBvh );
						triangle2.b.applyMatrix4( geometryToBvh );
						triangle2.c.applyMatrix4( geometryToBvh );
						triangle2.needsUpdate = true;

						for ( let i = offset, l = offset + count; i < l; i ++ ) {

							const ti = bvh.resolveTriangleIndex( i );
							setTriangle( triangle, 3 * ti, index, pos );

							triangle.needsUpdate = true;

							const dist = triangle.distanceToTriangle( triangle2, tempTarget1, tempTarget2 );
							if ( dist < closestDistance ) {

								tempTargetDest1.copy( tempTarget1 );

								if ( tempTargetDest2 ) {

									tempTargetDest2.copy( tempTarget2 );

								}

								closestDistance = dist;
								closestDistanceTriIndex = i;
								closestDistanceOtherTriIndex = i2;

							}

							// stop traversal if we find a point that's under the given threshold
							if ( dist < minThreshold ) {

								return true;

							}

						}

					}

				}

			},

		}

	);

	ExtendedTrianglePool.releasePrimitive( triangle );
	ExtendedTrianglePool.releasePrimitive( triangle2 );

	if ( closestDistance === Infinity ) {

		return null;

	}

	if ( ! target1.point ) {

		target1.point = tempTargetDest1.clone();

	} else {

		target1.point.copy( tempTargetDest1 );

	}

	target1.distance = closestDistance,
	target1.faceIndex = closestDistanceTriIndex;

	if ( target2 ) {

		if ( ! target2.point ) target2.point = tempTargetDest2.clone();
		else target2.point.copy( tempTargetDest2 );
		target2.point.applyMatrix4( tempMatrix );
		tempTargetDest1.applyMatrix4( tempMatrix );
		target2.distance = tempTargetDest1.sub( target2.point ).length();
		target2.faceIndex = closestDistanceOtherTriIndex;

	}

	return target1;

}

function isSharedArrayBufferSupported() {

	return typeof SharedArrayBuffer !== 'undefined';

}

const _bufferStack1 = new BufferStack.constructor();
const _bufferStack2 = new BufferStack.constructor();
const _boxPool = new PrimitivePool( () => new Box3() );
const _leftBox1 = new Box3();
const _rightBox1 = new Box3();

const _leftBox2 = new Box3();
const _rightBox2 = new Box3();

let _active = false;

function bvhcast( bvh, otherBvh, matrixToLocal, intersectsRanges ) {

	if ( _active ) {

		throw new Error( 'MeshBVH: Recursive calls to bvhcast not supported.' );

	}

	_active = true;

	const roots = bvh._roots;
	const otherRoots = otherBvh._roots;
	let result;
	let offset1 = 0;
	let offset2 = 0;
	const invMat = new Matrix4().copy( matrixToLocal ).invert();

	// iterate over the first set of roots
	for ( let i = 0, il = roots.length; i < il; i ++ ) {

		_bufferStack1.setBuffer( roots[ i ] );
		offset2 = 0;

		// prep the initial root box
		const localBox = _boxPool.getPrimitive();
		arrayToBox( BOUNDING_DATA_INDEX( 0 ), _bufferStack1.float32Array, localBox );
		localBox.applyMatrix4( invMat );

		// iterate over the second set of roots
		for ( let j = 0, jl = otherRoots.length; j < jl; j ++ ) {

			_bufferStack2.setBuffer( otherRoots[ i ] );

			result = _traverse(
				0, 0, matrixToLocal, invMat, intersectsRanges,
				offset1, offset2, 0, 0,
				localBox,
			);

			_bufferStack2.clearBuffer();
			offset2 += otherRoots[ j ].length;

			if ( result ) {

				break;

			}

		}

		// release stack info
		_boxPool.releasePrimitive( localBox );
		_bufferStack1.clearBuffer();
		offset1 += roots[ i ].length;

		if ( result ) {

			break;

		}

	}

	_active = false;
	return result;

}

function _traverse(
	node1Index32,
	node2Index32,
	matrix2to1,
	matrix1to2,
	intersectsRangesFunc,

	// offsets for ids
	node1IndexByteOffset = 0,
	node2IndexByteOffset = 0,

	// tree depth
	depth1 = 0,
	depth2 = 0,

	currBox = null,
	reversed = false,

) {

	// get the buffer stacks associated with the current indices
	let bufferStack1, bufferStack2;
	if ( reversed ) {

		bufferStack1 = _bufferStack2;
		bufferStack2 = _bufferStack1;

	} else {

		bufferStack1 = _bufferStack1;
		bufferStack2 = _bufferStack2;

	}

	// get the local instances of the typed buffers
	const
		float32Array1 = bufferStack1.float32Array,
		uint32Array1 = bufferStack1.uint32Array,
		uint16Array1 = bufferStack1.uint16Array,
		float32Array2 = bufferStack2.float32Array,
		uint32Array2 = bufferStack2.uint32Array,
		uint16Array2 = bufferStack2.uint16Array;

	const node1Index16 = node1Index32 * 2;
	const node2Index16 = node2Index32 * 2;
	const isLeaf1 = IS_LEAF( node1Index16, uint16Array1 );
	const isLeaf2 = IS_LEAF( node2Index16, uint16Array2 );
	let result = false;
	if ( isLeaf2 && isLeaf1 ) {

		// if both bounds are leaf nodes then fire the callback if the boxes intersect
		if ( reversed ) {

			result = intersectsRangesFunc(
				OFFSET( node2Index32, uint32Array2 ), COUNT( node2Index32 * 2, uint16Array2 ),
				OFFSET( node1Index32, uint32Array1 ), COUNT( node1Index32 * 2, uint16Array1 ),
				depth2, node2IndexByteOffset + node2Index32,
				depth1, node1IndexByteOffset + node1Index32,
			);

		} else {

			result = intersectsRangesFunc(
				OFFSET( node1Index32, uint32Array1 ), COUNT( node1Index32 * 2, uint16Array1 ),
				OFFSET( node2Index32, uint32Array2 ), COUNT( node2Index32 * 2, uint16Array2 ),
				depth1, node1IndexByteOffset + node1Index32,
				depth2, node2IndexByteOffset + node2Index32,
			);

		}

	} else if ( isLeaf2 ) {

		// SWAP
		// If we've traversed to the leaf node on the other bvh then we need to swap over
		// to traverse down the first one

		// get the new box to use
		const newBox = _boxPool.getPrimitive();
		arrayToBox( BOUNDING_DATA_INDEX( node2Index32 ), float32Array2, newBox );
		newBox.applyMatrix4( matrix2to1 );

		// get the child bounds to check before traversal
		const cl1 = LEFT_NODE( node1Index32 );
		const cr1 = RIGHT_NODE( node1Index32, uint32Array1 );
		arrayToBox( BOUNDING_DATA_INDEX( cl1 ), float32Array1, _leftBox1 );
		arrayToBox( BOUNDING_DATA_INDEX( cr1 ), float32Array1, _rightBox1 );

		// precompute the intersections otherwise the global boxes will be modified during traversal
		const intersectCl1 = newBox.intersectsBox( _leftBox1 );
		const intersectCr1 = newBox.intersectsBox( _rightBox1 );
		result = (
			intersectCl1 && _traverse(
				node2Index32, cl1, matrix1to2, matrix2to1, intersectsRangesFunc,
				node2IndexByteOffset, node1IndexByteOffset, depth2, depth1 + 1,
				newBox, ! reversed,
			)
		) || (
			intersectCr1 && _traverse(
				node2Index32, cr1, matrix1to2, matrix2to1, intersectsRangesFunc,
				node2IndexByteOffset, node1IndexByteOffset, depth2, depth1 + 1,
				newBox, ! reversed,
			)
		);

		_boxPool.releasePrimitive( newBox );

	} else {

		// if neither are leaves then we should swap if one of the children does not
		// intersect with the current bounds

		// get the child bounds to check
		const cl2 = LEFT_NODE( node2Index32 );
		const cr2 = RIGHT_NODE( node2Index32, uint32Array2 );
		arrayToBox( BOUNDING_DATA_INDEX( cl2 ), float32Array2, _leftBox2 );
		arrayToBox( BOUNDING_DATA_INDEX( cr2 ), float32Array2, _rightBox2 );

		const leftIntersects = currBox.intersectsBox( _leftBox2 );
		const rightIntersects = currBox.intersectsBox( _rightBox2 );
		if ( leftIntersects && rightIntersects ) {

			// continue to traverse both children if they both intersect
			result = _traverse(
				node1Index32, cl2, matrix2to1, matrix1to2, intersectsRangesFunc,
				node1IndexByteOffset, node2IndexByteOffset, depth1, depth2 + 1,
				currBox, reversed,
			) || _traverse(
				node1Index32, cr2, matrix2to1, matrix1to2, intersectsRangesFunc,
				node1IndexByteOffset, node2IndexByteOffset, depth1, depth2 + 1,
				currBox, reversed,
			);

		} else if ( leftIntersects ) {

			if ( isLeaf1 ) {

				// if the current box is a leaf then just continue
				result = _traverse(
					node1Index32, cl2, matrix2to1, matrix1to2, intersectsRangesFunc,
					node1IndexByteOffset, node2IndexByteOffset, depth1, depth2 + 1,
					currBox, reversed,
				);

			} else {

				// SWAP
				// if only one box intersects then we have to swap to the other bvh to continue
				const newBox = _boxPool.getPrimitive();
				newBox.copy( _leftBox2 ).applyMatrix4( matrix2to1 );

				const cl1 = LEFT_NODE( node1Index32 );
				const cr1 = RIGHT_NODE( node1Index32, uint32Array1 );
				arrayToBox( BOUNDING_DATA_INDEX( cl1 ), float32Array1, _leftBox1 );
				arrayToBox( BOUNDING_DATA_INDEX( cr1 ), float32Array1, _rightBox1 );

				// precompute the intersections otherwise the global boxes will be modified during traversal
				const intersectCl1 = newBox.intersectsBox( _leftBox1 );
				const intersectCr1 = newBox.intersectsBox( _rightBox1 );
				result = (
					intersectCl1 && _traverse(
						cl2, cl1, matrix1to2, matrix2to1, intersectsRangesFunc,
						node2IndexByteOffset, node1IndexByteOffset, depth2, depth1 + 1,
						newBox, ! reversed,
					)
				) || (
					intersectCr1 && _traverse(
						cl2, cr1, matrix1to2, matrix2to1, intersectsRangesFunc,
						node2IndexByteOffset, node1IndexByteOffset, depth2, depth1 + 1,
						newBox, ! reversed,
					)
				);

				_boxPool.releasePrimitive( newBox );

			}

		} else if ( rightIntersects ) {

			if ( isLeaf1 ) {

				// if the current box is a leaf then just continue
				result = _traverse(
					node1Index32, cr2, matrix2to1, matrix1to2, intersectsRangesFunc,
					node1IndexByteOffset, node2IndexByteOffset, depth1, depth2 + 1,
					currBox, reversed,
				);

			} else {

				// SWAP
				// if only one box intersects then we have to swap to the other bvh to continue
				const newBox = _boxPool.getPrimitive();
				newBox.copy( _rightBox2 ).applyMatrix4( matrix2to1 );

				const cl1 = LEFT_NODE( node1Index32 );
				const cr1 = RIGHT_NODE( node1Index32, uint32Array1 );
				arrayToBox( BOUNDING_DATA_INDEX( cl1 ), float32Array1, _leftBox1 );
				arrayToBox( BOUNDING_DATA_INDEX( cr1 ), float32Array1, _rightBox1 );

				// precompute the intersections otherwise the global boxes will be modified during traversal
				const intersectCl1 = newBox.intersectsBox( _leftBox1 );
				const intersectCr1 = newBox.intersectsBox( _rightBox1 );
				result = (
					intersectCl1 && _traverse(
						cr2, cl1, matrix1to2, matrix2to1, intersectsRangesFunc,
						node2IndexByteOffset, node1IndexByteOffset, depth2, depth1 + 1,
						newBox, ! reversed,
					)
				) || (
					intersectCr1 && _traverse(
						cr2, cr1, matrix1to2, matrix2to1, intersectsRangesFunc,
						node2IndexByteOffset, node1IndexByteOffset, depth2, depth1 + 1,
						newBox, ! reversed,
					)
				);

				_boxPool.releasePrimitive( newBox );

			}

		}

	}

	return result;

}

const obb = /* @__PURE__ */ new OrientedBox();
const tempBox = /* @__PURE__ */ new Box3();

class MeshBVH {

	static serialize( bvh, options = {} ) {

		options = {
			cloneBuffers: true,
			...options,
		};

		const geometry = bvh.geometry;
		const rootData = bvh._roots;
		const indirectBuffer = bvh._indirectBuffer;
		const indexAttribute = geometry.getIndex();
		let result;
		if ( options.cloneBuffers ) {

			result = {
				roots: rootData.map( root => root.slice() ),
				index: indexAttribute.array.slice(),
				indirectBuffer: indirectBuffer ? indirectBuffer.slice() : null,
			};

		} else {

			result = {
				roots: rootData,
				index: indexAttribute.array,
				indirectBuffer: indirectBuffer,
			};

		}

		return result;

	}

	static deserialize( data, geometry, options = {} ) {

		options = {
			setIndex: true,
			indirect: Boolean( data.indirectBuffer ),
			...options,
		};

		const { index, roots, indirectBuffer } = data;
		const bvh = new MeshBVH( geometry, { ...options, [ SKIP_GENERATION ]: true } );
		bvh._roots = roots;
		bvh._indirectBuffer = indirectBuffer || null;

		if ( options.setIndex ) {

			const indexAttribute = geometry.getIndex();
			if ( indexAttribute === null ) {

				const newIndex = new BufferAttribute( data.index, 1, false );
				geometry.setIndex( newIndex );

			} else if ( indexAttribute.array !== index ) {

				indexAttribute.array.set( index );
				indexAttribute.needsUpdate = true;

			}

		}

		return bvh;

	}

	get indirect() {

		return ! ! this._indirectBuffer;

	}

	constructor( geometry, options = {} ) {

		if ( ! geometry.isBufferGeometry ) {

			throw new Error( 'MeshBVH: Only BufferGeometries are supported.' );

		} else if ( geometry.index && geometry.index.isInterleavedBufferAttribute ) {

			throw new Error( 'MeshBVH: InterleavedBufferAttribute is not supported for the index attribute.' );

		}

		// default options
		options = Object.assign( {

			strategy: CENTER,
			maxDepth: 40,
			maxLeafTris: 10,
			verbose: true,
			useSharedArrayBuffer: false,
			setBoundingBox: true,
			onProgress: null,
			indirect: false,

			// undocumented options

			// Whether to skip generating the tree. Used for deserialization.
			[ SKIP_GENERATION ]: false,

		}, options );

		if ( options.useSharedArrayBuffer && ! isSharedArrayBufferSupported() ) {

			throw new Error( 'MeshBVH: SharedArrayBuffer is not available.' );

		}

		// retain references to the geometry so we can use them it without having to
		// take a geometry reference in every function.
		this.geometry = geometry;
		this._roots = null;
		this._indirectBuffer = null;
		if ( ! options[ SKIP_GENERATION ] ) {

			buildPackedTree( this, options );

			if ( ! geometry.boundingBox && options.setBoundingBox ) {

				geometry.boundingBox = this.getBoundingBox( new Box3() );

			}

		}

		const { _indirectBuffer } = this;
		this.resolveTriangleIndex = options.indirect ? i => _indirectBuffer[ i ] : i => i;

	}

	refit( nodeIndices = null ) {

		const refitFunc = this.indirect ? refit_indirect : refit;
		return refitFunc( this, nodeIndices );

	}

	traverse( callback, rootIndex = 0 ) {

		const buffer = this._roots[ rootIndex ];
		const uint32Array = new Uint32Array( buffer );
		const uint16Array = new Uint16Array( buffer );
		_traverse( 0 );

		function _traverse( node32Index, depth = 0 ) {

			const node16Index = node32Index * 2;
			const isLeaf = uint16Array[ node16Index + 15 ] === IS_LEAFNODE_FLAG;
			if ( isLeaf ) {

				const offset = uint32Array[ node32Index + 6 ];
				const count = uint16Array[ node16Index + 14 ];
				callback( depth, isLeaf, new Float32Array( buffer, node32Index * 4, 6 ), offset, count );

			} else {

				// TODO: use node functions here
				const left = node32Index + BYTES_PER_NODE / 4;
				const right = uint32Array[ node32Index + 6 ];
				const splitAxis = uint32Array[ node32Index + 7 ];
				const stopTraversal = callback( depth, isLeaf, new Float32Array( buffer, node32Index * 4, 6 ), splitAxis );

				if ( ! stopTraversal ) {

					_traverse( left, depth + 1 );
					_traverse( right, depth + 1 );

				}

			}

		}

	}

	/* Core Cast Functions */
	raycast( ray, materialOrSide = FrontSide ) {

		const roots = this._roots;
		const geometry = this.geometry;
		const intersects = [];
		const isMaterial = materialOrSide.isMaterial;
		const isArrayMaterial = Array.isArray( materialOrSide );

		const groups = geometry.groups;
		const side = isMaterial ? materialOrSide.side : materialOrSide;
		const raycastFunc = this.indirect ? raycast_indirect : raycast;
		for ( let i = 0, l = roots.length; i < l; i ++ ) {

			const materialSide = isArrayMaterial ? materialOrSide[ groups[ i ].materialIndex ].side : side;
			const startCount = intersects.length;

			raycastFunc( this, i, materialSide, ray, intersects );

			if ( isArrayMaterial ) {

				const materialIndex = groups[ i ].materialIndex;
				for ( let j = startCount, jl = intersects.length; j < jl; j ++ ) {

					intersects[ j ].face.materialIndex = materialIndex;

				}

			}

		}

		return intersects;

	}

	raycastFirst( ray, materialOrSide = FrontSide ) {

		const roots = this._roots;
		const geometry = this.geometry;
		const isMaterial = materialOrSide.isMaterial;
		const isArrayMaterial = Array.isArray( materialOrSide );

		let closestResult = null;

		const groups = geometry.groups;
		const side = isMaterial ? materialOrSide.side : materialOrSide;
		const raycastFirstFunc = this.indirect ? raycastFirst_indirect : raycastFirst;
		for ( let i = 0, l = roots.length; i < l; i ++ ) {

			const materialSide = isArrayMaterial ? materialOrSide[ groups[ i ].materialIndex ].side : side;
			const result = raycastFirstFunc( this, i, materialSide, ray );
			if ( result != null && ( closestResult == null || result.distance < closestResult.distance ) ) {

				closestResult = result;
				if ( isArrayMaterial ) {

					result.face.materialIndex = groups[ i ].materialIndex;

				}

			}

		}

		return closestResult;

	}

	intersectsGeometry( otherGeometry, geomToMesh ) {

		let result = false;
		const roots = this._roots;
		const intersectsGeometryFunc = this.indirect ? intersectsGeometry_indirect : intersectsGeometry;
		for ( let i = 0, l = roots.length; i < l; i ++ ) {

			result = intersectsGeometryFunc( this, i, otherGeometry, geomToMesh );

			if ( result ) {

				break;

			}

		}

		return result;

	}

	shapecast( callbacks ) {

		const triangle = ExtendedTrianglePool.getPrimitive();
		const iterateFunc = this.indirect ? iterateOverTriangles_indirect : iterateOverTriangles;
		let {
			boundsTraverseOrder,
			intersectsBounds,
			intersectsRange,
			intersectsTriangle,
		} = callbacks;

		// wrap the intersectsRange function
		if ( intersectsRange && intersectsTriangle ) {

			const originalIntersectsRange = intersectsRange;
			intersectsRange = ( offset, count, contained, depth, nodeIndex ) => {

				if ( ! originalIntersectsRange( offset, count, contained, depth, nodeIndex ) ) {

					return iterateFunc( offset, count, this, intersectsTriangle, contained, depth, triangle );

				}

				return true;

			};

		} else if ( ! intersectsRange ) {

			if ( intersectsTriangle ) {

				intersectsRange = ( offset, count, contained, depth ) => {

					return iterateFunc( offset, count, this, intersectsTriangle, contained, depth, triangle );

				};

			} else {

				intersectsRange = ( offset, count, contained ) => {

					return contained;

				};

			}

		}

		// run shapecast
		let result = false;
		let byteOffset = 0;
		const roots = this._roots;
		for ( let i = 0, l = roots.length; i < l; i ++ ) {

			const root = roots[ i ];
			result = shapecast( this, i, intersectsBounds, intersectsRange, boundsTraverseOrder, byteOffset );

			if ( result ) {

				break;

			}

			byteOffset += root.byteLength;

		}

		ExtendedTrianglePool.releasePrimitive( triangle );

		return result;

	}

	bvhcast( otherBvh, matrixToLocal, callbacks ) {

		let {
			intersectsRanges,
			intersectsTriangles,
		} = callbacks;

		const triangle1 = ExtendedTrianglePool.getPrimitive();
		const indexAttr1 = this.geometry.index;
		const positionAttr1 = this.geometry.attributes.position;
		const assignTriangle1 = this.indirect ?
			i1 => {


				const ti = this.resolveTriangleIndex( i1 );
				setTriangle( triangle1, ti * 3, indexAttr1, positionAttr1 );

			} :
			i1 => {

				setTriangle( triangle1, i1 * 3, indexAttr1, positionAttr1 );

			};

		const triangle2 = ExtendedTrianglePool.getPrimitive();
		const indexAttr2 = otherBvh.geometry.index;
		const positionAttr2 = otherBvh.geometry.attributes.position;
		const assignTriangle2 = otherBvh.indirect ?
			i2 => {

				const ti2 = otherBvh.resolveTriangleIndex( i2 );
				setTriangle( triangle2, ti2 * 3, indexAttr2, positionAttr2 );

			} :
			i2 => {

				setTriangle( triangle2, i2 * 3, indexAttr2, positionAttr2 );

			};

		// generate triangle callback if needed
		if ( intersectsTriangles ) {

			const iterateOverDoubleTriangles = ( offset1, count1, offset2, count2, depth1, index1, depth2, index2 ) => {

				for ( let i2 = offset2, l2 = offset2 + count2; i2 < l2; i2 ++ ) {

					assignTriangle2( i2 );

					triangle2.a.applyMatrix4( matrixToLocal );
					triangle2.b.applyMatrix4( matrixToLocal );
					triangle2.c.applyMatrix4( matrixToLocal );
					triangle2.needsUpdate = true;

					for ( let i1 = offset1, l1 = offset1 + count1; i1 < l1; i1 ++ ) {

						assignTriangle1( i1 );

						triangle1.needsUpdate = true;

						if ( intersectsTriangles( triangle1, triangle2, i1, i2, depth1, index1, depth2, index2 ) ) {

							return true;

						}

					}

				}

				return false;

			};

			if ( intersectsRanges ) {

				const originalIntersectsRanges = intersectsRanges;
				intersectsRanges = function ( offset1, count1, offset2, count2, depth1, index1, depth2, index2 ) {

					if ( ! originalIntersectsRanges( offset1, count1, offset2, count2, depth1, index1, depth2, index2 ) ) {

						return iterateOverDoubleTriangles( offset1, count1, offset2, count2, depth1, index1, depth2, index2 );

					}

					return true;

				};

			} else {

				intersectsRanges = iterateOverDoubleTriangles;

			}

		}

		return bvhcast( this, otherBvh, matrixToLocal, intersectsRanges );

	}


	/* Derived Cast Functions */
	intersectsBox( box, boxToMesh ) {

		obb.set( box.min, box.max, boxToMesh );
		obb.needsUpdate = true;

		return this.shapecast(
			{
				intersectsBounds: box => obb.intersectsBox( box ),
				intersectsTriangle: tri => obb.intersectsTriangle( tri )
			}
		);

	}

	intersectsSphere( sphere ) {

		return this.shapecast(
			{
				intersectsBounds: box => sphere.intersectsBox( box ),
				intersectsTriangle: tri => tri.intersectsSphere( sphere )
			}
		);

	}

	closestPointToGeometry( otherGeometry, geometryToBvh, target1 = { }, target2 = { }, minThreshold = 0, maxThreshold = Infinity ) {

		const closestPointToGeometryFunc = this.indirect ? closestPointToGeometry_indirect : closestPointToGeometry;
		return closestPointToGeometryFunc(
			this,
			otherGeometry,
			geometryToBvh,
			target1,
			target2,
			minThreshold,
			maxThreshold,
		);

	}

	closestPointToPoint( point, target = { }, minThreshold = 0, maxThreshold = Infinity ) {

		return closestPointToPoint(
			this,
			point,
			target,
			minThreshold,
			maxThreshold,
		);

	}

	getBoundingBox( target ) {

		target.makeEmpty();

		const roots = this._roots;
		roots.forEach( buffer => {

			arrayToBox( 0, new Float32Array( buffer ), tempBox );
			target.union( tempBox );

		} );

		return target;

	}

}

// converts the given BVH raycast intersection to align with the three.js raycast
// structure (include object, world space distance and point).
function convertRaycastIntersect( hit, object, raycaster ) {

	if ( hit === null ) {

		return null;

	}

	hit.point.applyMatrix4( object.matrixWorld );
	hit.distance = hit.point.distanceTo( raycaster.ray.origin );
	hit.object = object;

	if ( hit.distance < raycaster.near || hit.distance > raycaster.far ) {

		return null;

	} else {

		return hit;

	}

}

const ray = /* @__PURE__ */ new Ray();
const tmpInverseMatrix = /* @__PURE__ */ new Matrix4();
const origMeshRaycastFunc = Mesh.prototype.raycast;

function acceleratedRaycast( raycaster, intersects ) {

	if ( this.geometry.boundsTree ) {

		if ( this.material === undefined ) return;

		tmpInverseMatrix.copy( this.matrixWorld ).invert();
		ray.copy( raycaster.ray ).applyMatrix4( tmpInverseMatrix );

		const bvh = this.geometry.boundsTree;
		if ( raycaster.firstHitOnly === true ) {

			const hit = convertRaycastIntersect( bvh.raycastFirst( ray, this.material ), this, raycaster );
			if ( hit ) {

				intersects.push( hit );

			}

		} else {

			const hits = bvh.raycast( ray, this.material );
			for ( let i = 0, l = hits.length; i < l; i ++ ) {

				const hit = convertRaycastIntersect( hits[ i ], this, raycaster );
				if ( hit ) {

					intersects.push( hit );

				}

			}

		}

	} else {

		origMeshRaycastFunc.call( this, raycaster, intersects );

	}

}

function computeBoundsTree( options ) {

	this.boundsTree = new MeshBVH( this, options );
	return this.boundsTree;

}

function disposeBoundsTree() {

	this.boundsTree = null;

}

// Source: https://github.com/gkjohnson/three-mesh-bvh
class BVH {
    static apply(geometry) {
        if (!BVH.initialized) {
            BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
            BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
            Mesh.prototype.raycast = acceleratedRaycast;
            BVH.initialized = true;
        }
        if (!geometry.boundsTree) {
            geometry.computeBoundsTree();
        }
    }
    static dispose(geometry) {
        geometry.disposeBoundsTree();
    }
}
BVH.initialized = false;

/*
 * Fragments are just a simple wrapper around THREE.InstancedMesh.
 * Each fragments can contain Items (identified by ItemID) which
 * are mapped to one or many instances inside this THREE.InstancedMesh.
 *
 * Fragments also implement features like instance buffer resizing and
 * hiding out of the box.
 * */
let Fragment$1 = class Fragment {
    constructor(geometry, material, count) {
        this.ids = new Set();
        this.itemToInstances = new Map();
        this.instanceToItem = new Map();
        this.hiddenItems = new Set();
        this.capacity = 0;
        this.capacityOffset = 10;
        this.fragments = {};
        this._settingVisibility = false;
        this.mesh = new FragmentMesh(geometry, material, count, this);
        this.id = this.mesh.uuid;
        this.capacity = count;
        this.mesh.count = 0;
        if (this.mesh.geometry.index.count) {
            BVH.apply(this.mesh.geometry);
        }
    }
    dispose(disposeResources = true) {
        this.clear();
        this.group = undefined;
        if (this.mesh) {
            if (disposeResources) {
                for (const mat of this.mesh.material) {
                    mat.dispose();
                }
                this.mesh.material = [];
                BVH.dispose(this.mesh.geometry);
                this.mesh.geometry.dispose();
                this.mesh.geometry = null;
            }
            this.mesh.removeFromParent();
            this.mesh.dispose();
            this.mesh.fragment = null;
            this.mesh = null;
        }
        for (const key in this.fragments) {
            const frag = this.fragments[key];
            frag.dispose(disposeResources);
        }
        this.fragments = {};
    }
    get(itemID) {
        const instanceIDs = this.getInstancesIDs(itemID);
        if (!instanceIDs) {
            throw new Error("Item not found!");
        }
        const transforms = [];
        const colorsArray = [];
        for (const id of instanceIDs) {
            const matrix = new THREE.Matrix4();
            this.mesh.getMatrixAt(id, matrix);
            transforms.push(matrix);
            if (this.mesh.instanceColor) {
                const color = new THREE.Color();
                this.mesh.getColorAt(id, color);
                colorsArray.push(color);
            }
        }
        const colors = colorsArray.length ? colorsArray : undefined;
        return { id: itemID, transforms, colors };
    }
    getItemID(instanceID) {
        return this.instanceToItem.get(instanceID) || null;
    }
    getInstancesIDs(itemID) {
        return this.itemToInstances.get(itemID) || null;
    }
    update() {
        if (this.mesh.instanceColor) {
            this.mesh.instanceColor.needsUpdate = true;
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }
    add(items) {
        var _a;
        let size = 0;
        for (const item of items) {
            size += item.transforms.length;
        }
        const necessaryCapacity = this.mesh.count + size;
        if (necessaryCapacity > this.capacity) {
            const newCapacity = necessaryCapacity + this.capacityOffset;
            const newMesh = new FragmentMesh(this.mesh.geometry, this.mesh.material, newCapacity, this);
            newMesh.count = this.mesh.count;
            this.capacity = newCapacity;
            const oldMesh = this.mesh;
            (_a = oldMesh.parent) === null || _a === void 0 ? void 0 : _a.add(newMesh);
            oldMesh.removeFromParent();
            this.mesh = newMesh;
            const tempMatrix = new THREE.Matrix4();
            for (let i = 0; i < oldMesh.instanceMatrix.count; i++) {
                oldMesh.getMatrixAt(i, tempMatrix);
                newMesh.setMatrixAt(i, tempMatrix);
            }
            if (oldMesh.instanceColor) {
                const tempColor = new THREE.Color();
                for (let i = 0; i < oldMesh.instanceColor.count; i++) {
                    oldMesh.getColorAt(i, tempColor);
                    newMesh.setColorAt(i, tempColor);
                }
            }
            oldMesh.dispose();
        }
        for (let i = 0; i < items.length; i++) {
            const { transforms, colors, id } = items[i];
            if (!this.itemToInstances.has(id)) {
                this.itemToInstances.set(id, new Set());
            }
            const instances = this.itemToInstances.get(id);
            this.ids.add(id);
            for (let j = 0; j < transforms.length; j++) {
                const transform = transforms[j];
                const newInstanceID = this.mesh.count;
                this.mesh.setMatrixAt(newInstanceID, transform);
                if (colors) {
                    const color = colors[j];
                    this.mesh.setColorAt(newInstanceID, color);
                }
                instances.add(newInstanceID);
                this.instanceToItem.set(newInstanceID, id);
                this.mesh.count++;
            }
        }
        this.update();
    }
    remove(itemsIDs) {
        if (this.mesh.count === 0) {
            return;
        }
        for (const itemID of itemsIDs) {
            const instancesToDelete = this.itemToInstances.get(itemID);
            if (instancesToDelete === undefined) {
                throw new Error("Instances not found!");
            }
            for (const instanceID of instancesToDelete) {
                if (this.mesh.count === 0)
                    throw new Error("Errow with mesh count!");
                this.putLast(instanceID);
                this.instanceToItem.delete(instanceID);
                this.mesh.count--;
            }
            this.itemToInstances.delete(itemID);
            this.ids.delete(itemID);
        }
        this.update();
    }
    clear() {
        this.hiddenItems.clear();
        this.ids.clear();
        this.instanceToItem.clear();
        this.itemToInstances.clear();
        this.mesh.count = 0;
    }
    addFragment(id, material = this.mesh.material) {
        const newGeometry = new THREE.BufferGeometry();
        const attrs = this.mesh.geometry.attributes;
        newGeometry.setAttribute("position", attrs.position);
        newGeometry.setAttribute("normal", attrs.normal);
        newGeometry.setIndex(Array.from(this.mesh.geometry.index.array));
        const newFragment = new Fragment(newGeometry, material, this.capacity);
        const items = [];
        for (const id of this.ids) {
            const item = this.get(id);
            items.push(item);
        }
        newFragment.add(items);
        newFragment.mesh.applyMatrix4(this.mesh.matrix);
        newFragment.mesh.updateMatrix();
        this.fragments[id] = newFragment;
        return this.fragments[id];
    }
    removeFragment(id) {
        const fragment = this.fragments[id];
        if (fragment) {
            fragment.dispose(false);
            delete this.fragments[id];
        }
    }
    setVisibility(visible, itemIDs = this.ids) {
        if (this._settingVisibility)
            return;
        this._settingVisibility = true;
        if (visible) {
            for (const itemID of itemIDs) {
                if (!this.ids.has(itemID)) {
                    throw new Error(`This item doesn't exist here: ${itemID}`);
                }
                if (!this.hiddenItems.has(itemID)) {
                    continue;
                }
                const instances = this.itemToInstances.get(itemID);
                if (!instances)
                    throw new Error("Instances not found!");
                for (const instance of new Set(instances)) {
                    this.mesh.count++;
                    this.putLast(instance);
                }
                this.hiddenItems.delete(itemID);
            }
        }
        else {
            for (const itemID of itemIDs) {
                if (!this.ids.has(itemID)) {
                    throw new Error(`This item doesn't exist here: ${itemID}`);
                }
                if (this.hiddenItems.has(itemID)) {
                    continue;
                }
                const instances = this.itemToInstances.get(itemID);
                if (!instances)
                    throw new Error("Instances not found!");
                for (const instance of new Set(instances)) {
                    this.putLast(instance);
                    this.mesh.count--;
                }
                this.hiddenItems.add(itemID);
            }
        }
        this.update();
        this._settingVisibility = false;
    }
    applyTransform(itemIDs, transform) {
        const tempMatrix = new THREE.Matrix4();
        for (const itemID of itemIDs) {
            const instances = this.getInstancesIDs(itemID);
            if (instances === null) {
                continue;
            }
            for (const instanceID of instances) {
                this.mesh.getMatrixAt(instanceID, tempMatrix);
                tempMatrix.premultiply(transform);
                this.mesh.setMatrixAt(instanceID, tempMatrix);
            }
        }
        this.update();
    }
    exportData() {
        const geometry = this.mesh.exportData();
        const ids = Array.from(this.ids);
        const id = this.id;
        return { ...geometry, ids, id };
    }
    putLast(instanceID) {
        if (this.mesh.count === 0)
            return;
        const id1 = this.instanceToItem.get(instanceID);
        const instanceID2 = this.mesh.count - 1;
        if (instanceID2 === instanceID) {
            return;
        }
        const id2 = this.instanceToItem.get(instanceID2);
        if (id1 === undefined || id2 === undefined) {
            throw new Error("Keys not found");
        }
        if (id1 !== id2) {
            const instances1 = this.itemToInstances.get(id1);
            const instances2 = this.itemToInstances.get(id2);
            if (!instances1 || !instances2) {
                throw new Error("Instances not found");
            }
            if (!instances1.has(instanceID) || !instances2.has(instanceID2)) {
                throw new Error("Malformed fragment structure");
            }
            instances1.delete(instanceID);
            instances2.delete(instanceID2);
            instances1.add(instanceID2);
            instances2.add(instanceID);
            this.instanceToItem.set(instanceID, id2);
            this.instanceToItem.set(instanceID2, id1);
        }
        const transform1 = new THREE.Matrix4();
        const transform2 = new THREE.Matrix4();
        this.mesh.getMatrixAt(instanceID, transform1);
        this.mesh.getMatrixAt(instanceID2, transform2);
        this.mesh.setMatrixAt(instanceID, transform2);
        this.mesh.setMatrixAt(instanceID2, transform1);
        if (this.mesh.instanceColor !== null) {
            const color1 = new THREE.Color();
            const color2 = new THREE.Color();
            this.mesh.getColorAt(instanceID, color1);
            this.mesh.getColorAt(instanceID2, color2);
            this.mesh.setColorAt(instanceID, color2);
            this.mesh.setColorAt(instanceID2, color1);
        }
    }
};

const SIZEOF_SHORT = 2;
const SIZEOF_INT = 4;
const FILE_IDENTIFIER_LENGTH = 4;
const SIZE_PREFIX_LENGTH = 4;

const int32 = new Int32Array(2);
const float32 = new Float32Array(int32.buffer);
const float64 = new Float64Array(int32.buffer);
const isLittleEndian = new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;

var Encoding;
(function (Encoding) {
    Encoding[Encoding["UTF8_BYTES"] = 1] = "UTF8_BYTES";
    Encoding[Encoding["UTF16_STRING"] = 2] = "UTF16_STRING";
})(Encoding || (Encoding = {}));

class ByteBuffer {
    /**
     * Create a new ByteBuffer with a given array of bytes (`Uint8Array`)
     */
    constructor(bytes_) {
        this.bytes_ = bytes_;
        this.position_ = 0;
        this.text_decoder_ = new TextDecoder();
    }
    /**
     * Create and allocate a new ByteBuffer with a given size.
     */
    static allocate(byte_size) {
        return new ByteBuffer(new Uint8Array(byte_size));
    }
    clear() {
        this.position_ = 0;
    }
    /**
     * Get the underlying `Uint8Array`.
     */
    bytes() {
        return this.bytes_;
    }
    /**
     * Get the buffer's position.
     */
    position() {
        return this.position_;
    }
    /**
     * Set the buffer's position.
     */
    setPosition(position) {
        this.position_ = position;
    }
    /**
     * Get the buffer's capacity.
     */
    capacity() {
        return this.bytes_.length;
    }
    readInt8(offset) {
        return this.readUint8(offset) << 24 >> 24;
    }
    readUint8(offset) {
        return this.bytes_[offset];
    }
    readInt16(offset) {
        return this.readUint16(offset) << 16 >> 16;
    }
    readUint16(offset) {
        return this.bytes_[offset] | this.bytes_[offset + 1] << 8;
    }
    readInt32(offset) {
        return this.bytes_[offset] | this.bytes_[offset + 1] << 8 | this.bytes_[offset + 2] << 16 | this.bytes_[offset + 3] << 24;
    }
    readUint32(offset) {
        return this.readInt32(offset) >>> 0;
    }
    readInt64(offset) {
        return BigInt.asIntN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
    }
    readUint64(offset) {
        return BigInt.asUintN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
    }
    readFloat32(offset) {
        int32[0] = this.readInt32(offset);
        return float32[0];
    }
    readFloat64(offset) {
        int32[isLittleEndian ? 0 : 1] = this.readInt32(offset);
        int32[isLittleEndian ? 1 : 0] = this.readInt32(offset + 4);
        return float64[0];
    }
    writeInt8(offset, value) {
        this.bytes_[offset] = value;
    }
    writeUint8(offset, value) {
        this.bytes_[offset] = value;
    }
    writeInt16(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
    }
    writeUint16(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
    }
    writeInt32(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
        this.bytes_[offset + 2] = value >> 16;
        this.bytes_[offset + 3] = value >> 24;
    }
    writeUint32(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
        this.bytes_[offset + 2] = value >> 16;
        this.bytes_[offset + 3] = value >> 24;
    }
    writeInt64(offset, value) {
        this.writeInt32(offset, Number(BigInt.asIntN(32, value)));
        this.writeInt32(offset + 4, Number(BigInt.asIntN(32, value >> BigInt(32))));
    }
    writeUint64(offset, value) {
        this.writeUint32(offset, Number(BigInt.asUintN(32, value)));
        this.writeUint32(offset + 4, Number(BigInt.asUintN(32, value >> BigInt(32))));
    }
    writeFloat32(offset, value) {
        float32[0] = value;
        this.writeInt32(offset, int32[0]);
    }
    writeFloat64(offset, value) {
        float64[0] = value;
        this.writeInt32(offset, int32[isLittleEndian ? 0 : 1]);
        this.writeInt32(offset + 4, int32[isLittleEndian ? 1 : 0]);
    }
    /**
     * Return the file identifier.   Behavior is undefined for FlatBuffers whose
     * schema does not include a file_identifier (likely points at padding or the
     * start of a the root vtable).
     */
    getBufferIdentifier() {
        if (this.bytes_.length < this.position_ + SIZEOF_INT +
            FILE_IDENTIFIER_LENGTH) {
            throw new Error('FlatBuffers: ByteBuffer is too short to contain an identifier.');
        }
        let result = "";
        for (let i = 0; i < FILE_IDENTIFIER_LENGTH; i++) {
            result += String.fromCharCode(this.readInt8(this.position_ + SIZEOF_INT + i));
        }
        return result;
    }
    /**
     * Look up a field in the vtable, return an offset into the object, or 0 if the
     * field is not present.
     */
    __offset(bb_pos, vtable_offset) {
        const vtable = bb_pos - this.readInt32(bb_pos);
        return vtable_offset < this.readInt16(vtable) ? this.readInt16(vtable + vtable_offset) : 0;
    }
    /**
     * Initialize any Table-derived type to point to the union at the given offset.
     */
    __union(t, offset) {
        t.bb_pos = offset + this.readInt32(offset);
        t.bb = this;
        return t;
    }
    /**
     * Create a JavaScript string from UTF-8 data stored inside the FlatBuffer.
     * This allocates a new string and converts to wide chars upon each access.
     *
     * To avoid the conversion to string, pass Encoding.UTF8_BYTES as the
     * "optionalEncoding" argument. This is useful for avoiding conversion when
     * the data will just be packaged back up in another FlatBuffer later on.
     *
     * @param offset
     * @param opt_encoding Defaults to UTF16_STRING
     */
    __string(offset, opt_encoding) {
        offset += this.readInt32(offset);
        const length = this.readInt32(offset);
        offset += SIZEOF_INT;
        const utf8bytes = this.bytes_.subarray(offset, offset + length);
        if (opt_encoding === Encoding.UTF8_BYTES)
            return utf8bytes;
        else
            return this.text_decoder_.decode(utf8bytes);
    }
    /**
     * Handle unions that can contain string as its member, if a Table-derived type then initialize it,
     * if a string then return a new one
     *
     * WARNING: strings are immutable in JS so we can't change the string that the user gave us, this
     * makes the behaviour of __union_with_string different compared to __union
     */
    __union_with_string(o, offset) {
        if (typeof o === 'string') {
            return this.__string(offset);
        }
        return this.__union(o, offset);
    }
    /**
     * Retrieve the relative offset stored at "offset"
     */
    __indirect(offset) {
        return offset + this.readInt32(offset);
    }
    /**
     * Get the start of data of a vector whose offset is stored at "offset" in this object.
     */
    __vector(offset) {
        return offset + this.readInt32(offset) + SIZEOF_INT; // data starts after the length
    }
    /**
     * Get the length of a vector whose offset is stored at "offset" in this object.
     */
    __vector_len(offset) {
        return this.readInt32(offset + this.readInt32(offset));
    }
    __has_identifier(ident) {
        if (ident.length != FILE_IDENTIFIER_LENGTH) {
            throw new Error('FlatBuffers: file identifier must be length ' +
                FILE_IDENTIFIER_LENGTH);
        }
        for (let i = 0; i < FILE_IDENTIFIER_LENGTH; i++) {
            if (ident.charCodeAt(i) != this.readInt8(this.position() + SIZEOF_INT + i)) {
                return false;
            }
        }
        return true;
    }
    /**
     * A helper function for generating list for obj api
     */
    createScalarList(listAccessor, listLength) {
        const ret = [];
        for (let i = 0; i < listLength; ++i) {
            const val = listAccessor(i);
            if (val !== null) {
                ret.push(val);
            }
        }
        return ret;
    }
    /**
     * A helper function for generating list for obj api
     * @param listAccessor function that accepts an index and return data at that index
     * @param listLength listLength
     * @param res result list
     */
    createObjList(listAccessor, listLength) {
        const ret = [];
        for (let i = 0; i < listLength; ++i) {
            const val = listAccessor(i);
            if (val !== null) {
                ret.push(val.unpack());
            }
        }
        return ret;
    }
}

class Builder {
    /**
     * Create a FlatBufferBuilder.
     */
    constructor(opt_initial_size) {
        /** Minimum alignment encountered so far. */
        this.minalign = 1;
        /** The vtable for the current table. */
        this.vtable = null;
        /** The amount of fields we're actually using. */
        this.vtable_in_use = 0;
        /** Whether we are currently serializing a table. */
        this.isNested = false;
        /** Starting offset of the current struct/table. */
        this.object_start = 0;
        /** List of offsets of all vtables. */
        this.vtables = [];
        /** For the current vector being built. */
        this.vector_num_elems = 0;
        /** False omits default values from the serialized data */
        this.force_defaults = false;
        this.string_maps = null;
        this.text_encoder = new TextEncoder();
        let initial_size;
        if (!opt_initial_size) {
            initial_size = 1024;
        }
        else {
            initial_size = opt_initial_size;
        }
        /**
         * @type {ByteBuffer}
         * @private
         */
        this.bb = ByteBuffer.allocate(initial_size);
        this.space = initial_size;
    }
    clear() {
        this.bb.clear();
        this.space = this.bb.capacity();
        this.minalign = 1;
        this.vtable = null;
        this.vtable_in_use = 0;
        this.isNested = false;
        this.object_start = 0;
        this.vtables = [];
        this.vector_num_elems = 0;
        this.force_defaults = false;
        this.string_maps = null;
    }
    /**
     * In order to save space, fields that are set to their default value
     * don't get serialized into the buffer. Forcing defaults provides a
     * way to manually disable this optimization.
     *
     * @param forceDefaults true always serializes default values
     */
    forceDefaults(forceDefaults) {
        this.force_defaults = forceDefaults;
    }
    /**
     * Get the ByteBuffer representing the FlatBuffer. Only call this after you've
     * called finish(). The actual data starts at the ByteBuffer's current position,
     * not necessarily at 0.
     */
    dataBuffer() {
        return this.bb;
    }
    /**
     * Get the bytes representing the FlatBuffer. Only call this after you've
     * called finish().
     */
    asUint8Array() {
        return this.bb.bytes().subarray(this.bb.position(), this.bb.position() + this.offset());
    }
    /**
     * Prepare to write an element of `size` after `additional_bytes` have been
     * written, e.g. if you write a string, you need to align such the int length
     * field is aligned to 4 bytes, and the string data follows it directly. If all
     * you need to do is alignment, `additional_bytes` will be 0.
     *
     * @param size This is the of the new element to write
     * @param additional_bytes The padding size
     */
    prep(size, additional_bytes) {
        // Track the biggest thing we've ever aligned to.
        if (size > this.minalign) {
            this.minalign = size;
        }
        // Find the amount of alignment needed such that `size` is properly
        // aligned after `additional_bytes`
        const align_size = ((~(this.bb.capacity() - this.space + additional_bytes)) + 1) & (size - 1);
        // Reallocate the buffer if needed.
        while (this.space < align_size + size + additional_bytes) {
            const old_buf_size = this.bb.capacity();
            this.bb = Builder.growByteBuffer(this.bb);
            this.space += this.bb.capacity() - old_buf_size;
        }
        this.pad(align_size);
    }
    pad(byte_size) {
        for (let i = 0; i < byte_size; i++) {
            this.bb.writeInt8(--this.space, 0);
        }
    }
    writeInt8(value) {
        this.bb.writeInt8(this.space -= 1, value);
    }
    writeInt16(value) {
        this.bb.writeInt16(this.space -= 2, value);
    }
    writeInt32(value) {
        this.bb.writeInt32(this.space -= 4, value);
    }
    writeInt64(value) {
        this.bb.writeInt64(this.space -= 8, value);
    }
    writeFloat32(value) {
        this.bb.writeFloat32(this.space -= 4, value);
    }
    writeFloat64(value) {
        this.bb.writeFloat64(this.space -= 8, value);
    }
    /**
     * Add an `int8` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int8` to add the buffer.
     */
    addInt8(value) {
        this.prep(1, 0);
        this.writeInt8(value);
    }
    /**
     * Add an `int16` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int16` to add the buffer.
     */
    addInt16(value) {
        this.prep(2, 0);
        this.writeInt16(value);
    }
    /**
     * Add an `int32` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int32` to add the buffer.
     */
    addInt32(value) {
        this.prep(4, 0);
        this.writeInt32(value);
    }
    /**
     * Add an `int64` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int64` to add the buffer.
     */
    addInt64(value) {
        this.prep(8, 0);
        this.writeInt64(value);
    }
    /**
     * Add a `float32` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `float32` to add the buffer.
     */
    addFloat32(value) {
        this.prep(4, 0);
        this.writeFloat32(value);
    }
    /**
     * Add a `float64` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `float64` to add the buffer.
     */
    addFloat64(value) {
        this.prep(8, 0);
        this.writeFloat64(value);
    }
    addFieldInt8(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addInt8(value);
            this.slot(voffset);
        }
    }
    addFieldInt16(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addInt16(value);
            this.slot(voffset);
        }
    }
    addFieldInt32(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addInt32(value);
            this.slot(voffset);
        }
    }
    addFieldInt64(voffset, value, defaultValue) {
        if (this.force_defaults || value !== defaultValue) {
            this.addInt64(value);
            this.slot(voffset);
        }
    }
    addFieldFloat32(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addFloat32(value);
            this.slot(voffset);
        }
    }
    addFieldFloat64(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addFloat64(value);
            this.slot(voffset);
        }
    }
    addFieldOffset(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
            this.addOffset(value);
            this.slot(voffset);
        }
    }
    /**
     * Structs are stored inline, so nothing additional is being added. `d` is always 0.
     */
    addFieldStruct(voffset, value, defaultValue) {
        if (value != defaultValue) {
            this.nested(value);
            this.slot(voffset);
        }
    }
    /**
     * Structures are always stored inline, they need to be created right
     * where they're used.  You'll get this assertion failure if you
     * created it elsewhere.
     */
    nested(obj) {
        if (obj != this.offset()) {
            throw new TypeError('FlatBuffers: struct must be serialized inline.');
        }
    }
    /**
     * Should not be creating any other object, string or vector
     * while an object is being constructed
     */
    notNested() {
        if (this.isNested) {
            throw new TypeError('FlatBuffers: object serialization must not be nested.');
        }
    }
    /**
     * Set the current vtable at `voffset` to the current location in the buffer.
     */
    slot(voffset) {
        if (this.vtable !== null)
            this.vtable[voffset] = this.offset();
    }
    /**
     * @returns Offset relative to the end of the buffer.
     */
    offset() {
        return this.bb.capacity() - this.space;
    }
    /**
     * Doubles the size of the backing ByteBuffer and copies the old data towards
     * the end of the new buffer (since we build the buffer backwards).
     *
     * @param bb The current buffer with the existing data
     * @returns A new byte buffer with the old data copied
     * to it. The data is located at the end of the buffer.
     *
     * uint8Array.set() formally takes {Array<number>|ArrayBufferView}, so to pass
     * it a uint8Array we need to suppress the type check:
     * @suppress {checkTypes}
     */
    static growByteBuffer(bb) {
        const old_buf_size = bb.capacity();
        // Ensure we don't grow beyond what fits in an int.
        if (old_buf_size & 0xC0000000) {
            throw new Error('FlatBuffers: cannot grow buffer beyond 2 gigabytes.');
        }
        const new_buf_size = old_buf_size << 1;
        const nbb = ByteBuffer.allocate(new_buf_size);
        nbb.setPosition(new_buf_size - old_buf_size);
        nbb.bytes().set(bb.bytes(), new_buf_size - old_buf_size);
        return nbb;
    }
    /**
     * Adds on offset, relative to where it will be written.
     *
     * @param offset The offset to add.
     */
    addOffset(offset) {
        this.prep(SIZEOF_INT, 0); // Ensure alignment is already done.
        this.writeInt32(this.offset() - offset + SIZEOF_INT);
    }
    /**
     * Start encoding a new object in the buffer.  Users will not usually need to
     * call this directly. The FlatBuffers compiler will generate helper methods
     * that call this method internally.
     */
    startObject(numfields) {
        this.notNested();
        if (this.vtable == null) {
            this.vtable = [];
        }
        this.vtable_in_use = numfields;
        for (let i = 0; i < numfields; i++) {
            this.vtable[i] = 0; // This will push additional elements as needed
        }
        this.isNested = true;
        this.object_start = this.offset();
    }
    /**
     * Finish off writing the object that is under construction.
     *
     * @returns The offset to the object inside `dataBuffer`
     */
    endObject() {
        if (this.vtable == null || !this.isNested) {
            throw new Error('FlatBuffers: endObject called without startObject');
        }
        this.addInt32(0);
        const vtableloc = this.offset();
        // Trim trailing zeroes.
        let i = this.vtable_in_use - 1;
        // eslint-disable-next-line no-empty
        for (; i >= 0 && this.vtable[i] == 0; i--) { }
        const trimmed_size = i + 1;
        // Write out the current vtable.
        for (; i >= 0; i--) {
            // Offset relative to the start of the table.
            this.addInt16(this.vtable[i] != 0 ? vtableloc - this.vtable[i] : 0);
        }
        const standard_fields = 2; // The fields below:
        this.addInt16(vtableloc - this.object_start);
        const len = (trimmed_size + standard_fields) * SIZEOF_SHORT;
        this.addInt16(len);
        // Search for an existing vtable that matches the current one.
        let existing_vtable = 0;
        const vt1 = this.space;
        outer_loop: for (i = 0; i < this.vtables.length; i++) {
            const vt2 = this.bb.capacity() - this.vtables[i];
            if (len == this.bb.readInt16(vt2)) {
                for (let j = SIZEOF_SHORT; j < len; j += SIZEOF_SHORT) {
                    if (this.bb.readInt16(vt1 + j) != this.bb.readInt16(vt2 + j)) {
                        continue outer_loop;
                    }
                }
                existing_vtable = this.vtables[i];
                break;
            }
        }
        if (existing_vtable) {
            // Found a match:
            // Remove the current vtable.
            this.space = this.bb.capacity() - vtableloc;
            // Point table to existing vtable.
            this.bb.writeInt32(this.space, existing_vtable - vtableloc);
        }
        else {
            // No match:
            // Add the location of the current vtable to the list of vtables.
            this.vtables.push(this.offset());
            // Point table to current vtable.
            this.bb.writeInt32(this.bb.capacity() - vtableloc, this.offset() - vtableloc);
        }
        this.isNested = false;
        return vtableloc;
    }
    /**
     * Finalize a buffer, poiting to the given `root_table`.
     */
    finish(root_table, opt_file_identifier, opt_size_prefix) {
        const size_prefix = opt_size_prefix ? SIZE_PREFIX_LENGTH : 0;
        if (opt_file_identifier) {
            const file_identifier = opt_file_identifier;
            this.prep(this.minalign, SIZEOF_INT +
                FILE_IDENTIFIER_LENGTH + size_prefix);
            if (file_identifier.length != FILE_IDENTIFIER_LENGTH) {
                throw new TypeError('FlatBuffers: file identifier must be length ' +
                    FILE_IDENTIFIER_LENGTH);
            }
            for (let i = FILE_IDENTIFIER_LENGTH - 1; i >= 0; i--) {
                this.writeInt8(file_identifier.charCodeAt(i));
            }
        }
        this.prep(this.minalign, SIZEOF_INT + size_prefix);
        this.addOffset(root_table);
        if (size_prefix) {
            this.addInt32(this.bb.capacity() - this.space);
        }
        this.bb.setPosition(this.space);
    }
    /**
     * Finalize a size prefixed buffer, pointing to the given `root_table`.
     */
    finishSizePrefixed(root_table, opt_file_identifier) {
        this.finish(root_table, opt_file_identifier, true);
    }
    /**
     * This checks a required field has been set in a given table that has
     * just been constructed.
     */
    requiredField(table, field) {
        const table_start = this.bb.capacity() - table;
        const vtable_start = table_start - this.bb.readInt32(table_start);
        const ok = field < this.bb.readInt16(vtable_start) &&
            this.bb.readInt16(vtable_start + field) != 0;
        // If this fails, the caller will show what field needs to be set.
        if (!ok) {
            throw new TypeError('FlatBuffers: field ' + field + ' must be set');
        }
    }
    /**
     * Start a new array/vector of objects.  Users usually will not call
     * this directly. The FlatBuffers compiler will create a start/end
     * method for vector types in generated code.
     *
     * @param elem_size The size of each element in the array
     * @param num_elems The number of elements in the array
     * @param alignment The alignment of the array
     */
    startVector(elem_size, num_elems, alignment) {
        this.notNested();
        this.vector_num_elems = num_elems;
        this.prep(SIZEOF_INT, elem_size * num_elems);
        this.prep(alignment, elem_size * num_elems); // Just in case alignment > int.
    }
    /**
     * Finish off the creation of an array and all its elements. The array must be
     * created with `startVector`.
     *
     * @returns The offset at which the newly created array
     * starts.
     */
    endVector() {
        this.writeInt32(this.vector_num_elems);
        return this.offset();
    }
    /**
     * Encode the string `s` in the buffer using UTF-8. If the string passed has
     * already been seen, we return the offset of the already written string
     *
     * @param s The string to encode
     * @return The offset in the buffer where the encoded string starts
     */
    createSharedString(s) {
        if (!s) {
            return 0;
        }
        if (!this.string_maps) {
            this.string_maps = new Map();
        }
        if (this.string_maps.has(s)) {
            return this.string_maps.get(s);
        }
        const offset = this.createString(s);
        this.string_maps.set(s, offset);
        return offset;
    }
    /**
     * Encode the string `s` in the buffer using UTF-8. If a Uint8Array is passed
     * instead of a string, it is assumed to contain valid UTF-8 encoded data.
     *
     * @param s The string to encode
     * @return The offset in the buffer where the encoded string starts
     */
    createString(s) {
        if (s === null || s === undefined) {
            return 0;
        }
        let utf8;
        if (s instanceof Uint8Array) {
            utf8 = s;
        }
        else {
            utf8 = this.text_encoder.encode(s);
        }
        this.addInt8(0);
        this.startVector(1, utf8.length, 1);
        this.bb.setPosition(this.space -= utf8.length);
        for (let i = 0, offset = this.space, bytes = this.bb.bytes(); i < utf8.length; i++) {
            bytes[offset++] = utf8[i];
        }
        return this.endVector();
    }
    /**
     * A helper function to pack an object
     *
     * @returns offset of obj
     */
    createObjectOffset(obj) {
        if (obj === null) {
            return 0;
        }
        if (typeof obj === 'string') {
            return this.createString(obj);
        }
        else {
            return obj.pack(this);
        }
    }
    /**
     * A helper function to pack a list of object
     *
     * @returns list of offsets of each non null object
     */
    createObjectOffsetList(list) {
        const ret = [];
        for (let i = 0; i < list.length; ++i) {
            const val = list[i];
            if (val !== null) {
                ret.push(this.createObjectOffset(val));
            }
            else {
                throw new TypeError('FlatBuffers: Argument for createObjectOffsetList cannot contain null.');
            }
        }
        return ret;
    }
    createStructOffsetList(list, startFunc) {
        startFunc(this, list.length);
        this.createObjectOffsetList(list.slice().reverse());
        return this.endVector();
    }
}

// automatically generated by the FlatBuffers compiler, do not modify
class CivilCurve {
    constructor() {
        this.bb = null;
        this.bb_pos = 0;
    }
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsCivilCurve(bb, obj) {
        return (obj || new CivilCurve()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsCivilCurve(bb, obj) {
        bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
        return (obj || new CivilCurve()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    points(index) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    pointsLength() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    pointsArray() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    data(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startCivilCurve(builder) {
        builder.startObject(2);
    }
    static addPoints(builder, pointsOffset) {
        builder.addFieldOffset(0, pointsOffset, 0);
    }
    static createPointsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startPointsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addData(builder, dataOffset) {
        builder.addFieldOffset(1, dataOffset, 0);
    }
    static endCivilCurve(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static createCivilCurve(builder, pointsOffset, dataOffset) {
        CivilCurve.startCivilCurve(builder);
        CivilCurve.addPoints(builder, pointsOffset);
        CivilCurve.addData(builder, dataOffset);
        return CivilCurve.endCivilCurve(builder);
    }
}

// automatically generated by the FlatBuffers compiler, do not modify
class Alignment {
    constructor() {
        this.bb = null;
        this.bb_pos = 0;
    }
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsAlignment(bb, obj) {
        return (obj || new Alignment()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsAlignment(bb, obj) {
        bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
        return (obj || new Alignment()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    vertical(index, obj) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? (obj || new CivilCurve()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    verticalLength() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    horizontal(index, obj) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? (obj || new CivilCurve()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    horizontalLength() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    absolute(index, obj) {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? (obj || new CivilCurve()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    absoluteLength() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    initialPk() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0.0;
    }
    static startAlignment(builder) {
        builder.startObject(4);
    }
    static addVertical(builder, verticalOffset) {
        builder.addFieldOffset(0, verticalOffset, 0);
    }
    static createVerticalVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startVerticalVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addHorizontal(builder, horizontalOffset) {
        builder.addFieldOffset(1, horizontalOffset, 0);
    }
    static createHorizontalVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startHorizontalVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addAbsolute(builder, absoluteOffset) {
        builder.addFieldOffset(2, absoluteOffset, 0);
    }
    static createAbsoluteVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startAbsoluteVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addInitialPk(builder, initialPk) {
        builder.addFieldFloat32(3, initialPk, 0.0);
    }
    static endAlignment(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static createAlignment(builder, verticalOffset, horizontalOffset, absoluteOffset, initialPk) {
        Alignment.startAlignment(builder);
        Alignment.addVertical(builder, verticalOffset);
        Alignment.addHorizontal(builder, horizontalOffset);
        Alignment.addAbsolute(builder, absoluteOffset);
        Alignment.addInitialPk(builder, initialPk);
        return Alignment.endAlignment(builder);
    }
}

// automatically generated by the FlatBuffers compiler, do not modify
class CivilData {
    constructor() {
        this.bb = null;
        this.bb_pos = 0;
    }
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsCivilData(bb, obj) {
        return (obj || new CivilData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsCivilData(bb, obj) {
        bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
        return (obj || new CivilData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    alignments(index, obj) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? (obj || new Alignment()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    alignmentsLength() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    coordinationMatrix(index) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    coordinationMatrixLength() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    coordinationMatrixArray() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    static startCivilData(builder) {
        builder.startObject(2);
    }
    static addAlignments(builder, alignmentsOffset) {
        builder.addFieldOffset(0, alignmentsOffset, 0);
    }
    static createAlignmentsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startAlignmentsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addCoordinationMatrix(builder, coordinationMatrixOffset) {
        builder.addFieldOffset(1, coordinationMatrixOffset, 0);
    }
    static createCoordinationMatrixVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startCoordinationMatrixVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endCivilData(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static createCivilData(builder, alignmentsOffset, coordinationMatrixOffset) {
        CivilData.startCivilData(builder);
        CivilData.addAlignments(builder, alignmentsOffset);
        CivilData.addCoordinationMatrix(builder, coordinationMatrixOffset);
        return CivilData.endCivilData(builder);
    }
}

// automatically generated by the FlatBuffers compiler, do not modify
class Fragment {
    constructor() {
        this.bb = null;
        this.bb_pos = 0;
    }
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsFragment(bb, obj) {
        return (obj || new Fragment()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsFragment(bb, obj) {
        bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
        return (obj || new Fragment()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    position(index) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    positionLength() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    positionArray() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    normal(index) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    normalLength() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    normalArray() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    index(index) {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    indexLength() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    indexArray() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    groups(index) {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    groupsLength() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    groupsArray() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    materials(index) {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    materialsLength() {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    materialsArray() {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    matrices(index) {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    matricesLength() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    matricesArray() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    colors(index) {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    colorsLength() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    colorsArray() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    itemsSize(index) {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    itemsSizeLength() {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    itemsSizeArray() {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    ids(index) {
        const offset = this.bb.__offset(this.bb_pos, 20);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    idsLength() {
        const offset = this.bb.__offset(this.bb_pos, 20);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    idsArray() {
        const offset = this.bb.__offset(this.bb_pos, 20);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    id(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 22);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    capacity() {
        const offset = this.bb.__offset(this.bb_pos, 24);
        return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    capacityOffset() {
        const offset = this.bb.__offset(this.bb_pos, 26);
        return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    static startFragment(builder) {
        builder.startObject(12);
    }
    static addPosition(builder, positionOffset) {
        builder.addFieldOffset(0, positionOffset, 0);
    }
    static createPositionVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startPositionVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addNormal(builder, normalOffset) {
        builder.addFieldOffset(1, normalOffset, 0);
    }
    static createNormalVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startNormalVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addIndex(builder, indexOffset) {
        builder.addFieldOffset(2, indexOffset, 0);
    }
    static createIndexVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startIndexVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addGroups(builder, groupsOffset) {
        builder.addFieldOffset(3, groupsOffset, 0);
    }
    static createGroupsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startGroupsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addMaterials(builder, materialsOffset) {
        builder.addFieldOffset(4, materialsOffset, 0);
    }
    static createMaterialsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startMaterialsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addMatrices(builder, matricesOffset) {
        builder.addFieldOffset(5, matricesOffset, 0);
    }
    static createMatricesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startMatricesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addColors(builder, colorsOffset) {
        builder.addFieldOffset(6, colorsOffset, 0);
    }
    static createColorsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startColorsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addItemsSize(builder, itemsSizeOffset) {
        builder.addFieldOffset(7, itemsSizeOffset, 0);
    }
    static createItemsSizeVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startItemsSizeVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addIds(builder, idsOffset) {
        builder.addFieldOffset(8, idsOffset, 0);
    }
    static createIdsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startIdsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addId(builder, idOffset) {
        builder.addFieldOffset(9, idOffset, 0);
    }
    static addCapacity(builder, capacity) {
        builder.addFieldInt32(10, capacity, 0);
    }
    static addCapacityOffset(builder, capacityOffset) {
        builder.addFieldInt32(11, capacityOffset, 0);
    }
    static endFragment(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static createFragment(builder, positionOffset, normalOffset, indexOffset, groupsOffset, materialsOffset, matricesOffset, colorsOffset, itemsSizeOffset, idsOffset, idOffset, capacity, capacityOffset) {
        Fragment.startFragment(builder);
        Fragment.addPosition(builder, positionOffset);
        Fragment.addNormal(builder, normalOffset);
        Fragment.addIndex(builder, indexOffset);
        Fragment.addGroups(builder, groupsOffset);
        Fragment.addMaterials(builder, materialsOffset);
        Fragment.addMatrices(builder, matricesOffset);
        Fragment.addColors(builder, colorsOffset);
        Fragment.addItemsSize(builder, itemsSizeOffset);
        Fragment.addIds(builder, idsOffset);
        Fragment.addId(builder, idOffset);
        Fragment.addCapacity(builder, capacity);
        Fragment.addCapacityOffset(builder, capacityOffset);
        return Fragment.endFragment(builder);
    }
}

// automatically generated by the FlatBuffers compiler, do not modify
let FragmentsGroup$1 = class FragmentsGroup {
    constructor() {
        this.bb = null;
        this.bb_pos = 0;
    }
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsFragmentsGroup(bb, obj) {
        return (obj || new FragmentsGroup()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsFragmentsGroup(bb, obj) {
        bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
        return (obj || new FragmentsGroup()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    items(index, obj) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? (obj || new Fragment()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    itemsLength() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    civil(obj) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? (obj || new CivilData()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }
    coordinationMatrix(index) {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    coordinationMatrixLength() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    coordinationMatrixArray() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    ids(index) {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    idsLength() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    idsArray() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    itemsKeys(index) {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    itemsKeysLength() {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    itemsKeysArray() {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    itemsKeysIndices(index) {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    itemsKeysIndicesLength() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    itemsKeysIndicesArray() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    itemsRels(index) {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    itemsRelsLength() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    itemsRelsArray() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    itemsRelsIndices(index) {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    itemsRelsIndicesLength() {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    itemsRelsIndicesArray() {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    fragmentKeys(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 20);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    id(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 22);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    name(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 24);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    ifcName(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 26);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    ifcDescription(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 28);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    ifcSchema(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 30);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    maxExpressId() {
        const offset = this.bb.__offset(this.bb_pos, 32);
        return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    boundingBox(index) {
        const offset = this.bb.__offset(this.bb_pos, 34);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    boundingBoxLength() {
        const offset = this.bb.__offset(this.bb_pos, 34);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    boundingBoxArray() {
        const offset = this.bb.__offset(this.bb_pos, 34);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    opaqueGeometriesIds(index) {
        const offset = this.bb.__offset(this.bb_pos, 36);
        return offset ? this.bb.readInt32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    opaqueGeometriesIdsLength() {
        const offset = this.bb.__offset(this.bb_pos, 36);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    opaqueGeometriesIdsArray() {
        const offset = this.bb.__offset(this.bb_pos, 36);
        return offset ? new Int32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    transparentGeometriesIds(index) {
        const offset = this.bb.__offset(this.bb_pos, 38);
        return offset ? this.bb.readInt32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    transparentGeometriesIdsLength() {
        const offset = this.bb.__offset(this.bb_pos, 38);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    transparentGeometriesIdsArray() {
        const offset = this.bb.__offset(this.bb_pos, 38);
        return offset ? new Int32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    static startFragmentsGroup(builder) {
        builder.startObject(18);
    }
    static addItems(builder, itemsOffset) {
        builder.addFieldOffset(0, itemsOffset, 0);
    }
    static createItemsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startItemsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addCivil(builder, civilOffset) {
        builder.addFieldOffset(1, civilOffset, 0);
    }
    static addCoordinationMatrix(builder, coordinationMatrixOffset) {
        builder.addFieldOffset(2, coordinationMatrixOffset, 0);
    }
    static createCoordinationMatrixVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startCoordinationMatrixVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addIds(builder, idsOffset) {
        builder.addFieldOffset(3, idsOffset, 0);
    }
    static createIdsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startIdsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addItemsKeys(builder, itemsKeysOffset) {
        builder.addFieldOffset(4, itemsKeysOffset, 0);
    }
    static createItemsKeysVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startItemsKeysVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addItemsKeysIndices(builder, itemsKeysIndicesOffset) {
        builder.addFieldOffset(5, itemsKeysIndicesOffset, 0);
    }
    static createItemsKeysIndicesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startItemsKeysIndicesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addItemsRels(builder, itemsRelsOffset) {
        builder.addFieldOffset(6, itemsRelsOffset, 0);
    }
    static createItemsRelsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startItemsRelsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addItemsRelsIndices(builder, itemsRelsIndicesOffset) {
        builder.addFieldOffset(7, itemsRelsIndicesOffset, 0);
    }
    static createItemsRelsIndicesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startItemsRelsIndicesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addFragmentKeys(builder, fragmentKeysOffset) {
        builder.addFieldOffset(8, fragmentKeysOffset, 0);
    }
    static addId(builder, idOffset) {
        builder.addFieldOffset(9, idOffset, 0);
    }
    static addName(builder, nameOffset) {
        builder.addFieldOffset(10, nameOffset, 0);
    }
    static addIfcName(builder, ifcNameOffset) {
        builder.addFieldOffset(11, ifcNameOffset, 0);
    }
    static addIfcDescription(builder, ifcDescriptionOffset) {
        builder.addFieldOffset(12, ifcDescriptionOffset, 0);
    }
    static addIfcSchema(builder, ifcSchemaOffset) {
        builder.addFieldOffset(13, ifcSchemaOffset, 0);
    }
    static addMaxExpressId(builder, maxExpressId) {
        builder.addFieldInt32(14, maxExpressId, 0);
    }
    static addBoundingBox(builder, boundingBoxOffset) {
        builder.addFieldOffset(15, boundingBoxOffset, 0);
    }
    static createBoundingBoxVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startBoundingBoxVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addOpaqueGeometriesIds(builder, opaqueGeometriesIdsOffset) {
        builder.addFieldOffset(16, opaqueGeometriesIdsOffset, 0);
    }
    static createOpaqueGeometriesIdsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startOpaqueGeometriesIdsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addTransparentGeometriesIds(builder, transparentGeometriesIdsOffset) {
        builder.addFieldOffset(17, transparentGeometriesIdsOffset, 0);
    }
    static createTransparentGeometriesIdsVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startTransparentGeometriesIdsVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endFragmentsGroup(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static finishFragmentsGroupBuffer(builder, offset) {
        builder.finish(offset);
    }
    static finishSizePrefixedFragmentsGroupBuffer(builder, offset) {
        builder.finish(offset, undefined, true);
    }
};

/* unzipit@1.4.3, license MIT */
/* global SharedArrayBuffer, process */

function readBlobAsArrayBuffer(blob) {
  if (blob.arrayBuffer) {
    return blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      resolve(reader.result);
    });
    reader.addEventListener('error', reject);
    reader.readAsArrayBuffer(blob);
  });
}

async function readBlobAsUint8Array(blob) {
  const arrayBuffer = await readBlobAsArrayBuffer(blob);
  return new Uint8Array(arrayBuffer);
}

function isBlob(v) {
  return typeof Blob !== 'undefined' && v instanceof Blob;
}

function isSharedArrayBuffer(b) {
  return typeof SharedArrayBuffer !== 'undefined' && b instanceof SharedArrayBuffer;
}

const isNode =
    (typeof process !== 'undefined') &&
    process.versions &&
    (typeof process.versions.node !== 'undefined') &&
    (typeof process.versions.electron === 'undefined');

function isTypedArraySameAsArrayBuffer(typedArray) {
  return typedArray.byteOffset === 0 && typedArray.byteLength === typedArray.buffer.byteLength;
}

class ArrayBufferReader {
  constructor(arrayBufferOrView) {
    this.typedArray = (arrayBufferOrView instanceof ArrayBuffer || isSharedArrayBuffer(arrayBufferOrView))
       ? new Uint8Array(arrayBufferOrView)
       : new Uint8Array(arrayBufferOrView.buffer, arrayBufferOrView.byteOffset, arrayBufferOrView.byteLength);
  }
  async getLength() {
    return this.typedArray.byteLength;
  }
  async read(offset, length) {
    return new Uint8Array(this.typedArray.buffer, this.typedArray.byteOffset + offset, length);
  }
}

class BlobReader {
  constructor(blob) {
    this.blob = blob;
  }
  async getLength() {
    return this.blob.size;
  }
  async read(offset, length) {
    const blob = this.blob.slice(offset, offset + length);
    const arrayBuffer = await readBlobAsArrayBuffer(blob);
    return new Uint8Array(arrayBuffer);
  }
  async sliceAsBlob(offset, length, type = '') {
    return this.blob.slice(offset, offset + length, type);
  }
}

function inflate(data, buf) {
	var u8=Uint8Array;
	if(data[0]==3 && data[1]==0) return (buf ? buf : new u8(0));
	var bitsF = _bitsF, bitsE = _bitsE, decodeTiny = _decodeTiny, get17 = _get17;
	
	var noBuf = (buf==null);
	if(noBuf) buf = new u8((data.length>>>2)<<3);
	
	var BFINAL=0, BTYPE=0, HLIT=0, HDIST=0, HCLEN=0, ML=0, MD=0; 	
	var off = 0, pos = 0;
	var lmap, dmap;
	
	while(BFINAL==0) {		
		BFINAL = bitsF(data, pos  , 1);
		BTYPE  = bitsF(data, pos+1, 2);  pos+=3;
		//console.log(BFINAL, BTYPE);
		
		if(BTYPE==0) {
			if((pos&7)!=0) pos+=8-(pos&7);
			var p8 = (pos>>>3)+4, len = data[p8-4]|(data[p8-3]<<8);  //console.log(len);//bitsF(data, pos, 16), 
			if(noBuf) buf=_check(buf, off+len);
			buf.set(new u8(data.buffer, data.byteOffset+p8, len), off);
			//for(var i=0; i<len; i++) buf[off+i] = data[p8+i];
			//for(var i=0; i<len; i++) if(buf[off+i] != data[p8+i]) throw "e";
			pos = ((p8+len)<<3);  off+=len;  continue;
		}
		if(noBuf) buf=_check(buf, off+(1<<17));  // really not enough in many cases (but PNG and ZIP provide buffer in advance)
		if(BTYPE==1) {  lmap = U.flmap;  dmap = U.fdmap;  ML = (1<<9)-1;  MD = (1<<5)-1;   }
		if(BTYPE==2) {
			HLIT  = bitsE(data, pos   , 5)+257;  
			HDIST = bitsE(data, pos+ 5, 5)+  1;  
			HCLEN = bitsE(data, pos+10, 4)+  4;  pos+=14;
			for(var i=0; i<38; i+=2) {  U.itree[i]=0;  U.itree[i+1]=0;  }
			var tl = 1;
			for(var i=0; i<HCLEN; i++) {  var l=bitsE(data, pos+i*3, 3);  U.itree[(U.ordr[i]<<1)+1] = l;  if(l>tl)tl=l;  }     pos+=3*HCLEN;  //console.log(itree);
			makeCodes(U.itree, tl);
			codes2map(U.itree, tl, U.imap);
			
			lmap = U.lmap;  dmap = U.dmap;
			
			pos = decodeTiny(U.imap, (1<<tl)-1, HLIT+HDIST, data, pos, U.ttree);
			var mx0 = _copyOut(U.ttree,    0, HLIT , U.ltree);  ML = (1<<mx0)-1;
			var mx1 = _copyOut(U.ttree, HLIT, HDIST, U.dtree);  MD = (1<<mx1)-1;
			
			//var ml = decodeTiny(U.imap, (1<<tl)-1, HLIT , data, pos, U.ltree); ML = (1<<(ml>>>24))-1;  pos+=(ml&0xffffff);
			makeCodes(U.ltree, mx0);
			codes2map(U.ltree, mx0, lmap);
			
			//var md = decodeTiny(U.imap, (1<<tl)-1, HDIST, data, pos, U.dtree); MD = (1<<(md>>>24))-1;  pos+=(md&0xffffff);
			makeCodes(U.dtree, mx1);
			codes2map(U.dtree, mx1, dmap);
		}
		//var ooff=off, opos=pos;
		while(true) {
			var code = lmap[get17(data, pos) & ML];  pos += code&15;
			var lit = code>>>4;  //U.lhst[lit]++;  
			if((lit>>>8)==0) {  buf[off++] = lit;  }
			else if(lit==256) {  break;  }
			else {
				var end = off+lit-254;
				if(lit>264) { var ebs = U.ldef[lit-257];  end = off + (ebs>>>3) + bitsE(data, pos, ebs&7);  pos += ebs&7;  }
				//dst[end-off]++;
				
				var dcode = dmap[get17(data, pos) & MD];  pos += dcode&15;
				var dlit = dcode>>>4;
				var dbs = U.ddef[dlit], dst = (dbs>>>4) + bitsF(data, pos, dbs&15);  pos += dbs&15;
				
				//var o0 = off-dst, stp = Math.min(end-off, dst);
				//if(stp>20) while(off<end) {  buf.copyWithin(off, o0, o0+stp);  off+=stp;  }  else
				//if(end-dst<=off) buf.copyWithin(off, off-dst, end-dst);  else
				//if(dst==1) buf.fill(buf[off-1], off, end);  else
				if(noBuf) buf=_check(buf, off+(1<<17));
				while(off<end) {  buf[off]=buf[off++-dst];    buf[off]=buf[off++-dst];  buf[off]=buf[off++-dst];  buf[off]=buf[off++-dst];  }   
				off=end;
				//while(off!=end) {  buf[off]=buf[off++-dst];  }
			}
		}
		//console.log(off-ooff, (pos-opos)>>>3);
	}
	//console.log(dst);
	//console.log(tlen, dlen, off-tlen+tcnt);
	return buf.length==off ? buf : buf.slice(0,off);
}
function _check(buf, len) {
	var bl=buf.length;  if(len<=bl) return buf;
	var nbuf = new Uint8Array(Math.max(bl<<1,len));  nbuf.set(buf,0);
	//for(var i=0; i<bl; i+=4) {  nbuf[i]=buf[i];  nbuf[i+1]=buf[i+1];  nbuf[i+2]=buf[i+2];  nbuf[i+3]=buf[i+3];  }
	return nbuf;
}

function _decodeTiny(lmap, LL, len, data, pos, tree) {
	var bitsE = _bitsE, get17 = _get17;
	var i = 0;
	while(i<len) {
		var code = lmap[get17(data, pos)&LL];  pos+=code&15;
		var lit = code>>>4; 
		if(lit<=15) {  tree[i]=lit;  i++;  }
		else {
			var ll = 0, n = 0;
			if(lit==16) {
				n = (3  + bitsE(data, pos, 2));  pos += 2;  ll = tree[i-1];
			}
			else if(lit==17) {
				n = (3  + bitsE(data, pos, 3));  pos += 3;
			}
			else if(lit==18) {
				n = (11 + bitsE(data, pos, 7));  pos += 7;
			}
			var ni = i+n;
			while(i<ni) {  tree[i]=ll;  i++; }
		}
	}
	return pos;
}
function _copyOut(src, off, len, tree) {
	var mx=0, i=0, tl=tree.length>>>1;
	while(i<len) {  var v=src[i+off];  tree[(i<<1)]=0;  tree[(i<<1)+1]=v;  if(v>mx)mx=v;  i++;  }
	while(i<tl ) {  tree[(i<<1)]=0;  tree[(i<<1)+1]=0;  i++;  }
	return mx;
}

function makeCodes(tree, MAX_BITS) {  // code, length
	var max_code = tree.length;
	var code, bits, n, i, len;
	
	var bl_count = U.bl_count;  for(var i=0; i<=MAX_BITS; i++) bl_count[i]=0;
	for(i=1; i<max_code; i+=2) bl_count[tree[i]]++;
	
	var next_code = U.next_code;	// smallest code for each length
	
	code = 0;
	bl_count[0] = 0;
	for (bits = 1; bits <= MAX_BITS; bits++) {
		code = (code + bl_count[bits-1]) << 1;
		next_code[bits] = code;
	}
	
	for (n = 0; n < max_code; n+=2) {
		len = tree[n+1];
		if (len != 0) {
			tree[n] = next_code[len];
			next_code[len]++;
		}
	}
}
function codes2map(tree, MAX_BITS, map) {
	var max_code = tree.length;
	var r15 = U.rev15;
	for(var i=0; i<max_code; i+=2) if(tree[i+1]!=0)  {
		var lit = i>>1;
		var cl = tree[i+1], val = (lit<<4)|cl; // :  (0x8000 | (U.of0[lit-257]<<7) | (U.exb[lit-257]<<4) | cl);
		var rest = (MAX_BITS-cl), i0 = tree[i]<<rest, i1 = i0 + (1<<rest);
		//tree[i]=r15[i0]>>>(15-MAX_BITS);
		while(i0!=i1) {
			var p0 = r15[i0]>>>(15-MAX_BITS);
			map[p0]=val;  i0++;
		}
	}
}
function revCodes(tree, MAX_BITS) {
	var r15 = U.rev15, imb = 15-MAX_BITS;
	for(var i=0; i<tree.length; i+=2) {  var i0 = (tree[i]<<(MAX_BITS-tree[i+1]));  tree[i] = r15[i0]>>>imb;  }
}

function _bitsE(dt, pos, length) {  return ((dt[pos>>>3] | (dt[(pos>>>3)+1]<<8)                        )>>>(pos&7))&((1<<length)-1);  }
function _bitsF(dt, pos, length) {  return ((dt[pos>>>3] | (dt[(pos>>>3)+1]<<8) | (dt[(pos>>>3)+2]<<16))>>>(pos&7))&((1<<length)-1);  }
/*
function _get9(dt, pos) {
	return ((dt[pos>>>3] | (dt[(pos>>>3)+1]<<8))>>>(pos&7))&511;
} */
function _get17(dt, pos) {	// return at least 17 meaningful bytes
	return (dt[pos>>>3] | (dt[(pos>>>3)+1]<<8) | (dt[(pos>>>3)+2]<<16) )>>>(pos&7);
}
const U = function(){
	var u16=Uint16Array, u32=Uint32Array;
	return {
		next_code : new u16(16),
		bl_count  : new u16(16),
		ordr : [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ],
		of0  : [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,999,999,999],
		exb  : [0,0,0,0,0,0,0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4,  4,  5,  5,  5,  5,  0,  0,  0,  0],
		ldef : new u16(32),
		df0  : [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577, 65535, 65535],
		dxb  : [0,0,0,0,1,1,2, 2, 3, 3, 4, 4, 5, 5,  6,  6,  7,  7,  8,  8,   9,   9,  10,  10,  11,  11,  12,   12,   13,   13,     0,     0],
		ddef : new u32(32),
		flmap: new u16(  512),  fltree: [],
		fdmap: new u16(   32),  fdtree: [],
		lmap : new u16(32768),  ltree : [],  ttree:[],
		dmap : new u16(32768),  dtree : [],
		imap : new u16(  512),  itree : [],
		//rev9 : new u16(  512)
		rev15: new u16(1<<15),
		lhst : new u32(286), dhst : new u32( 30), ihst : new u32(19),
		lits : new u32(15000),
		strt : new u16(1<<16),
		prev : new u16(1<<15)
	};  
} ();

(function(){	
	var len = 1<<15;
	for(var i=0; i<len; i++) {
		var x = i;
		x = (((x & 0xaaaaaaaa) >>> 1) | ((x & 0x55555555) << 1));
		x = (((x & 0xcccccccc) >>> 2) | ((x & 0x33333333) << 2));
		x = (((x & 0xf0f0f0f0) >>> 4) | ((x & 0x0f0f0f0f) << 4));
		x = (((x & 0xff00ff00) >>> 8) | ((x & 0x00ff00ff) << 8));
		U.rev15[i] = (((x >>> 16) | (x << 16)))>>>17;
	}
	
	function pushV(tgt, n, sv) {  while(n--!=0) tgt.push(0,sv);  }
	
	for(var i=0; i<32; i++) {  U.ldef[i]=(U.of0[i]<<3)|U.exb[i];  U.ddef[i]=(U.df0[i]<<4)|U.dxb[i];  }
	
	pushV(U.fltree, 144, 8);  pushV(U.fltree, 255-143, 9);  pushV(U.fltree, 279-255, 7);  pushV(U.fltree,287-279,8);
	/*
	var i = 0;
	for(; i<=143; i++) U.fltree.push(0,8);
	for(; i<=255; i++) U.fltree.push(0,9);
	for(; i<=279; i++) U.fltree.push(0,7);
	for(; i<=287; i++) U.fltree.push(0,8);
	*/
	makeCodes(U.fltree, 9);
	codes2map(U.fltree, 9, U.flmap);
	revCodes (U.fltree, 9);
	
	pushV(U.fdtree,32,5);
	//for(i=0;i<32; i++) U.fdtree.push(0,5);
	makeCodes(U.fdtree, 5);
	codes2map(U.fdtree, 5, U.fdmap);
	revCodes (U.fdtree, 5);
	
	pushV(U.itree,19,0);  pushV(U.ltree,286,0);  pushV(U.dtree,30,0);  pushV(U.ttree,320,0);
	/*
	for(var i=0; i< 19; i++) U.itree.push(0,0);
	for(var i=0; i<286; i++) U.ltree.push(0,0);
	for(var i=0; i< 30; i++) U.dtree.push(0,0);
	for(var i=0; i<320; i++) U.ttree.push(0,0);
	*/
})();

const crc = {
	table : ( function() {
	   var tab = new Uint32Array(256);
	   for (var n=0; n<256; n++) {
			var c = n;
			for (var k=0; k<8; k++) {
				if (c & 1)  c = 0xedb88320 ^ (c >>> 1);
				else        c = c >>> 1;
			}
			tab[n] = c;  }    
		return tab;  })(),
	update : function(c, buf, off, len) {
		for (var i=0; i<len; i++)  c = crc.table[(c ^ buf[off+i]) & 0xff] ^ (c >>> 8);
		return c;
	},
	crc : function(b,o,l)  {  return crc.update(0xffffffff,b,o,l) ^ 0xffffffff;  }
};

function inflateRaw(file, buf) {  return inflate(file, buf);  }

/* global module */

const config = {
  numWorkers: 1,
  workerURL: '',
  useWorkers: false,
};

let nextId = 0;
const waitingForWorkerQueue = [];

// Because Firefox uses non-standard onerror to signal an error.
function startWorker(url) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(url);
    worker.onmessage = (e) => {
      if (e.data === 'start') {
        worker.onerror = undefined;
        worker.onmessage = undefined;
        resolve(worker);
      } else {
        reject(new Error(`unexpected message: ${e.data}`));
      }
    };
    worker.onerror = reject;
  });
}

function dynamicRequire(mod, request) {
  return mod.require ? mod.require(request) : {};
}

((function() {
  if (isNode) {
    // We need to use `dynamicRequire` because `require` on it's own will be optimized by webpack.
    const {Worker} = dynamicRequire(module, 'worker_threads');
    return {
      async createWorker(url) {
        return new Worker(url);
      },
      addEventListener(worker, fn) {
        worker.on('message', (data) => {
          fn({target: worker, data});
        });
      },
      async terminate(worker) {
        await worker.terminate();
      },
    };
  } else {
    return {
      async createWorker(url) {
        // I don't understand this security issue
        // Apparently there is some iframe setting or http header
        // that prevents cross domain workers. But, I can manually
        // download the text and do it. I reported this to Chrome
        // and they said it was fine so ¯\_(ツ)_/¯
        try {
          const worker = await startWorker(url);
          return worker;
        } catch (e) {
          console.warn('could not load worker:', url);
        }

        let text;
        try {
          const req = await fetch(url, {mode: 'cors'});
          if (!req.ok) {
            throw new Error(`could not load: ${url}`);
          }
          text = await req.text();
          url = URL.createObjectURL(new Blob([text], {type: 'application/javascript'}));
          const worker = await startWorker(url);
          config.workerURL = url;  // this is a hack. What's a better way to structure this code?
          return worker;
        } catch (e) {
          console.warn('could not load worker via fetch:', url);
        }

        if (text !== undefined) {
          try {
            url = `data:application/javascript;base64,${btoa(text)}`;
            const worker = await startWorker(url);
            config.workerURL = url;
            return worker;
          } catch (e) {
            console.warn('could not load worker via dataURI');
          }
        }

        console.warn('workers will not be used');
        throw new Error('can not start workers');
      },
      addEventListener(worker, fn) {
        worker.addEventListener('message', fn);
      },
      async terminate(worker) {
        worker.terminate();
      },
    };
  }
})());

// @param {Uint8Array} src
// @param {number} uncompressedSize
// @param {string} [type] mime-type
// @returns {ArrayBuffer|Blob} ArrayBuffer if type is falsy or Blob otherwise.
function inflateRawLocal(src, uncompressedSize, type, resolve) {
  const dst = new Uint8Array(uncompressedSize);
  inflateRaw(src, dst);
  resolve(type
     ? new Blob([dst], {type})
     : dst.buffer);
}

async function processWaitingForWorkerQueue() {
  if (waitingForWorkerQueue.length === 0) {
    return;
  }

  // inflate locally
  // We loop here because what happens if many requests happen at once
  // the first N requests will try to async make a worker. Other requests
  // will then be on the queue. But if we fail to make workers then there
  // are pending requests.
  while (waitingForWorkerQueue.length) {
    const {src, uncompressedSize, type, resolve} = waitingForWorkerQueue.shift();
    let data = src;
    if (isBlob(src)) {
      data = await readBlobAsUint8Array(src);
    }
    inflateRawLocal(data, uncompressedSize, type, resolve);
  }
}

// It has to take non-zero time to put a large typed array in a Blob since the very
// next instruction you could change the contents of the array. So, if you're reading
// the zip file for images/video/audio then all you want is a Blob on which to get a URL.
// so that operation of putting the data in a Blob should happen in the worker.
//
// Conversely if you want the data itself then you want an ArrayBuffer immediately
// since the worker can transfer its ArrayBuffer zero copy.
//
// @param {Uint8Array|Blob} src
// @param {number} uncompressedSize
// @param {string} [type] falsy or mimeType string (eg: 'image/png')
// @returns {ArrayBuffer|Blob} ArrayBuffer if type is falsy or Blob otherwise.
function inflateRawAsync(src, uncompressedSize, type) {
  return new Promise((resolve, reject) => {
    // note: there is potential an expensive copy here. In order for the data
    // to make it into the worker we need to copy the data to the worker unless
    // it's a Blob or a SharedArrayBuffer.
    //
    // Solutions:
    //
    // 1. A minor enhancement, if `uncompressedSize` is small don't call the worker.
    //
    //    might be a win period as their is overhead calling the worker
    //
    // 2. Move the entire library to the worker
    //
    //    Good, Maybe faster if you pass a URL, Blob, or SharedArrayBuffer? Not sure about that
    //    as those are also easy to transfer. Still slow if you pass an ArrayBuffer
    //    as the ArrayBuffer has to be copied to the worker.
    //
    // I guess benchmarking is really the only thing to try.
    waitingForWorkerQueue.push({src, uncompressedSize, type, resolve, reject, id: nextId++});
    processWaitingForWorkerQueue();
  });
}

/*
class Zip {
  constructor(reader) {
    comment,  // the comment for this entry
    commentBytes, // the raw comment for this entry
  }
}
*/

function dosDateTimeToDate(date, time) {
  const day = date & 0x1f; // 1-31
  const month = (date >> 5 & 0xf) - 1; // 1-12, 0-11
  const year = (date >> 9 & 0x7f) + 1980; // 0-128, 1980-2108

  const millisecond = 0;
  const second = (time & 0x1f) * 2; // 0-29, 0-58 (even numbers)
  const minute = time >> 5 & 0x3f; // 0-59
  const hour = time >> 11 & 0x1f; // 0-23

  return new Date(year, month, day, hour, minute, second, millisecond);
}

class ZipEntry {
  constructor(reader, rawEntry) {
    this._reader = reader;
    this._rawEntry = rawEntry;
    this.name = rawEntry.name;
    this.nameBytes = rawEntry.nameBytes;
    this.size = rawEntry.uncompressedSize;
    this.compressedSize = rawEntry.compressedSize;
    this.comment = rawEntry.comment;
    this.commentBytes = rawEntry.commentBytes;
    this.compressionMethod = rawEntry.compressionMethod;
    this.lastModDate = dosDateTimeToDate(rawEntry.lastModFileDate, rawEntry.lastModFileTime);
    this.isDirectory = rawEntry.uncompressedSize === 0 && rawEntry.name.endsWith('/');
    this.encrypted = !!(rawEntry.generalPurposeBitFlag & 0x1);
    this.externalFileAttributes = rawEntry.externalFileAttributes;
    this.versionMadeBy = rawEntry.versionMadeBy;
  }
  // returns a promise that returns a Blob for this entry
  async blob(type = 'application/octet-stream') {
    return await readEntryDataAsBlob(this._reader, this._rawEntry, type);
  }
  // returns a promise that returns an ArrayBuffer for this entry
  async arrayBuffer() {
    return await readEntryDataAsArrayBuffer(this._reader, this._rawEntry);
  }
  // returns text, assumes the text is valid utf8. If you want more options decode arrayBuffer yourself
  async text() {
    const buffer = await this.arrayBuffer();
    return decodeBuffer(new Uint8Array(buffer));
  }
  // returns text with JSON.parse called on it. If you want more options decode arrayBuffer yourself
  async json() {
    const text = await this.text();
    return JSON.parse(text);
  }
}

const EOCDR_WITHOUT_COMMENT_SIZE = 22;
const MAX_COMMENT_SIZE = 0xffff; // 2-byte size
const EOCDR_SIGNATURE = 0x06054b50;
const ZIP64_EOCDR_SIGNATURE = 0x06064b50;

async function readAs(reader, offset, length) {
  return await reader.read(offset, length);
}

// The point of this function is we want to be able to pass the data
// to a worker as fast as possible so when decompressing if the data
// is already a blob and we can get a blob then get a blob.
//
// I'm not sure what a better way to refactor this is. We've got examples
// of multiple readers. Ideally, for every type of reader we could ask
// it, "give me a type that is zero copy both locally and when sent to a worker".
//
// The problem is the worker would also have to know the how to handle this
// opaque type. I suppose the correct solution is to register different
// reader handlers in the worker so BlobReader would register some
// `handleZeroCopyType<BlobReader>`. At the moment I don't feel like
// refactoring. As it is you just pass in an instance of the reader
// but instead you'd have to register the reader and some how get the
// source for the `handleZeroCopyType` handler function into the worker.
// That sounds like a huge PITA, requiring you to put the implementation
// in a separate file so the worker can load it or some other workaround
// hack.
//
// For now this hack works even if it's not generic.
async function readAsBlobOrTypedArray(reader, offset, length, type) {
  if (reader.sliceAsBlob) {
    return await reader.sliceAsBlob(offset, length, type);
  }
  return await reader.read(offset, length);
}

const crc$1 = {
  unsigned() {
    return 0;
  },
};

function getUint16LE(uint8View, offset) {
  return uint8View[offset    ] +
         uint8View[offset + 1] * 0x100;
}

function getUint32LE(uint8View, offset) {
  return uint8View[offset    ] +
         uint8View[offset + 1] * 0x100 +
         uint8View[offset + 2] * 0x10000 +
         uint8View[offset + 3] * 0x1000000;
}

function getUint64LE(uint8View, offset) {
  return getUint32LE(uint8View, offset) +
         getUint32LE(uint8View, offset + 4) * 0x100000000;
}

/* eslint-disable no-irregular-whitespace */
// const decodeCP437 = (function() {
//   const cp437 = '\u0000☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
//
//   return function(uint8view) {
//     return Array.from(uint8view).map(v => cp437[v]).join('');
//   };
// }());
/* eslint-enable no-irregular-whitespace */

const utf8Decoder = new TextDecoder();
function decodeBuffer(uint8View, isUTF8) {  /* eslint-disable-line no-unused-vars */ /* lgtm [js/superfluous-trailing-arguments] */
  if (isSharedArrayBuffer(uint8View.buffer)) {
    uint8View = new Uint8Array(uint8View);
  }
  return utf8Decoder.decode(uint8View);
  /*
  AFAICT the UTF8 flat is not set so it's 100% up to the user
  to self decode if their file is not utf8 filenames
  return isUTF8
      ? utf8Decoder.decode(uint8View)
      : decodeCP437(uint8View);
  */
}

async function findEndOfCentralDirector(reader, totalLength) {
  const size = Math.min(EOCDR_WITHOUT_COMMENT_SIZE + MAX_COMMENT_SIZE, totalLength);
  const readStart = totalLength - size;
  const data = await readAs(reader, readStart, size);
  for (let i = size - EOCDR_WITHOUT_COMMENT_SIZE; i >= 0; --i) {
    if (getUint32LE(data, i) !== EOCDR_SIGNATURE) {
      continue;
    }

    // 0 - End of central directory signature
    const eocdr = new Uint8Array(data.buffer, data.byteOffset + i, data.byteLength - i);
    // 4 - Number of this disk
    const diskNumber = getUint16LE(eocdr, 4);
    if (diskNumber !== 0) {
      throw new Error(`multi-volume zip files are not supported. This is volume: ${diskNumber}`);
    }

    // 6 - Disk where central directory starts
    // 8 - Number of central directory records on this disk
    // 10 - Total number of central directory records
    const entryCount = getUint16LE(eocdr, 10);
    // 12 - Size of central directory (bytes)
    const centralDirectorySize = getUint32LE(eocdr, 12);
    // 16 - Offset of start of central directory, relative to start of archive
    const centralDirectoryOffset = getUint32LE(eocdr, 16);
    // 20 - Comment length
    const commentLength = getUint16LE(eocdr, 20);
    const expectedCommentLength = eocdr.length - EOCDR_WITHOUT_COMMENT_SIZE;
    if (commentLength !== expectedCommentLength) {
      throw new Error(`invalid comment length. expected: ${expectedCommentLength}, actual: ${commentLength}`);
    }

    // 22 - Comment
    // the encoding is always cp437.
    const commentBytes = new Uint8Array(eocdr.buffer, eocdr.byteOffset + 22, commentLength);
    const comment = decodeBuffer(commentBytes);

    if (entryCount === 0xffff || centralDirectoryOffset === 0xffffffff) {
      return await readZip64CentralDirectory(reader, readStart + i, comment, commentBytes);
    } else {
      return await readEntries(reader, centralDirectoryOffset, centralDirectorySize, entryCount, comment, commentBytes);
    }
  }

  throw new Error('could not find end of central directory. maybe not zip file');
}

const END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE = 0x07064b50;

async function readZip64CentralDirectory(reader, offset, comment, commentBytes) {
  // ZIP64 Zip64 end of central directory locator
  const zip64EocdlOffset = offset - 20;
  const eocdl = await readAs(reader, zip64EocdlOffset, 20);

  // 0 - zip64 end of central dir locator signature
  if (getUint32LE(eocdl, 0) !== END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE) {
    throw new Error('invalid zip64 end of central directory locator signature');
  }

  // 4 - number of the disk with the start of the zip64 end of central directory
  // 8 - relative offset of the zip64 end of central directory record
  const zip64EocdrOffset = getUint64LE(eocdl, 8);
  // 16 - total number of disks

  // ZIP64 end of central directory record
  const zip64Eocdr = await readAs(reader, zip64EocdrOffset, 56);

  // 0 - zip64 end of central dir signature                           4 bytes  (0x06064b50)
  if (getUint32LE(zip64Eocdr, 0) !== ZIP64_EOCDR_SIGNATURE) {
    throw new Error('invalid zip64 end of central directory record signature');
  }
  // 4 - size of zip64 end of central directory record                8 bytes
  // 12 - version made by                                             2 bytes
  // 14 - version needed to extract                                   2 bytes
  // 16 - number of this disk                                         4 bytes
  // 20 - number of the disk with the start of the central directory  4 bytes
  // 24 - total number of entries in the central directory on this disk         8 bytes
  // 32 - total number of entries in the central directory            8 bytes
  const entryCount = getUint64LE(zip64Eocdr, 32);
  // 40 - size of the central directory                               8 bytes
  const centralDirectorySize = getUint64LE(zip64Eocdr, 40);
  // 48 - offset of start of central directory with respect to the starting disk number     8 bytes
  const centralDirectoryOffset = getUint64LE(zip64Eocdr, 48);
  // 56 - zip64 extensible data sector                                (variable size)
  return readEntries(reader, centralDirectoryOffset, centralDirectorySize, entryCount, comment, commentBytes);
}

const CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE = 0x02014b50;

async function readEntries(reader, centralDirectoryOffset, centralDirectorySize, rawEntryCount, comment, commentBytes) {
  let readEntryCursor = 0;
  const allEntriesBuffer = await readAs(reader, centralDirectoryOffset, centralDirectorySize);
  const rawEntries = [];

  for (let e = 0; e < rawEntryCount; ++e) {
    const buffer = allEntriesBuffer.subarray(readEntryCursor, readEntryCursor + 46);
    // 0 - Central directory file header signature
    const signature = getUint32LE(buffer, 0);
    if (signature !== CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE) {
      throw new Error(`invalid central directory file header signature: 0x${signature.toString(16)}`);
    }
    const rawEntry = {
      // 4 - Version made by
      versionMadeBy: getUint16LE(buffer, 4),
      // 6 - Version needed to extract (minimum)
      versionNeededToExtract: getUint16LE(buffer, 6),
      // 8 - General purpose bit flag
      generalPurposeBitFlag: getUint16LE(buffer, 8),
      // 10 - Compression method
      compressionMethod: getUint16LE(buffer, 10),
      // 12 - File last modification time
      lastModFileTime: getUint16LE(buffer, 12),
      // 14 - File last modification date
      lastModFileDate: getUint16LE(buffer, 14),
      // 16 - CRC-32
      crc32: getUint32LE(buffer, 16),
      // 20 - Compressed size
      compressedSize: getUint32LE(buffer, 20),
      // 24 - Uncompressed size
      uncompressedSize: getUint32LE(buffer, 24),
      // 28 - File name length (n)
      fileNameLength: getUint16LE(buffer, 28),
      // 30 - Extra field length (m)
      extraFieldLength: getUint16LE(buffer, 30),
      // 32 - File comment length (k)
      fileCommentLength: getUint16LE(buffer, 32),
      // 34 - Disk number where file starts
      // 36 - Internal file attributes
      internalFileAttributes: getUint16LE(buffer, 36),
      // 38 - External file attributes
      externalFileAttributes: getUint32LE(buffer, 38),
      // 42 - Relative offset of local file header
      relativeOffsetOfLocalHeader: getUint32LE(buffer, 42),
    };

    if (rawEntry.generalPurposeBitFlag & 0x40) {
      throw new Error('strong encryption is not supported');
    }

    readEntryCursor += 46;

    const data = allEntriesBuffer.subarray(readEntryCursor, readEntryCursor + rawEntry.fileNameLength + rawEntry.extraFieldLength + rawEntry.fileCommentLength);
    rawEntry.nameBytes = data.slice(0, rawEntry.fileNameLength);
    rawEntry.name = decodeBuffer(rawEntry.nameBytes);

    // 46+n - Extra field
    const fileCommentStart = rawEntry.fileNameLength + rawEntry.extraFieldLength;
    const extraFieldBuffer = data.slice(rawEntry.fileNameLength, fileCommentStart);
    rawEntry.extraFields = [];
    let i = 0;
    while (i < extraFieldBuffer.length - 3) {
      const headerId = getUint16LE(extraFieldBuffer, i + 0);
      const dataSize = getUint16LE(extraFieldBuffer, i + 2);
      const dataStart = i + 4;
      const dataEnd = dataStart + dataSize;
      if (dataEnd > extraFieldBuffer.length) {
        throw new Error('extra field length exceeds extra field buffer size');
      }
      rawEntry.extraFields.push({
        id: headerId,
        data: extraFieldBuffer.slice(dataStart, dataEnd),
      });
      i = dataEnd;
    }

    // 46+n+m - File comment
    rawEntry.commentBytes = data.slice(fileCommentStart, fileCommentStart + rawEntry.fileCommentLength);
    rawEntry.comment = decodeBuffer(rawEntry.commentBytes);

    readEntryCursor += data.length;

    if (rawEntry.uncompressedSize            === 0xffffffff ||
        rawEntry.compressedSize              === 0xffffffff ||
        rawEntry.relativeOffsetOfLocalHeader === 0xffffffff) {
      // ZIP64 format
      // find the Zip64 Extended Information Extra Field
      const zip64ExtraField = rawEntry.extraFields.find(e => e.id === 0x0001);
      if (!zip64ExtraField) {
        throw new Error('expected zip64 extended information extra field');
      }
      const zip64EiefBuffer = zip64ExtraField.data;
      let index = 0;
      // 0 - Original Size          8 bytes
      if (rawEntry.uncompressedSize === 0xffffffff) {
        if (index + 8 > zip64EiefBuffer.length) {
          throw new Error('zip64 extended information extra field does not include uncompressed size');
        }
        rawEntry.uncompressedSize = getUint64LE(zip64EiefBuffer, index);
        index += 8;
      }
      // 8 - Compressed Size        8 bytes
      if (rawEntry.compressedSize === 0xffffffff) {
        if (index + 8 > zip64EiefBuffer.length) {
          throw new Error('zip64 extended information extra field does not include compressed size');
        }
        rawEntry.compressedSize = getUint64LE(zip64EiefBuffer, index);
        index += 8;
      }
      // 16 - Relative Header Offset 8 bytes
      if (rawEntry.relativeOffsetOfLocalHeader === 0xffffffff) {
        if (index + 8 > zip64EiefBuffer.length) {
          throw new Error('zip64 extended information extra field does not include relative header offset');
        }
        rawEntry.relativeOffsetOfLocalHeader = getUint64LE(zip64EiefBuffer, index);
        index += 8;
      }
      // 24 - Disk Start Number      4 bytes
    }

    // check for Info-ZIP Unicode Path Extra Field (0x7075)
    // see https://github.com/thejoshwolfe/yauzl/issues/33
    const nameField = rawEntry.extraFields.find(e =>
        e.id === 0x7075 &&
        e.data.length >= 6 && // too short to be meaningful
        e.data[0] === 1 &&    // Version       1 byte      version of this extra field, currently 1
        getUint32LE(e.data, 1), crc$1.unsigned(rawEntry.nameBytes)); // NameCRC32     4 bytes     File Name Field CRC32 Checksum
                                                                   // > If the CRC check fails, this UTF-8 Path Extra Field should be
                                                                   // > ignored and the File Name field in the header should be used instead.
    if (nameField) {
        // UnicodeName Variable UTF-8 version of the entry File Name
        rawEntry.fileName = decodeBuffer(nameField.data.slice(5));
    }

    // validate file size
    if (rawEntry.compressionMethod === 0) {
      let expectedCompressedSize = rawEntry.uncompressedSize;
      if ((rawEntry.generalPurposeBitFlag & 0x1) !== 0) {
        // traditional encryption prefixes the file data with a header
        expectedCompressedSize += 12;
      }
      if (rawEntry.compressedSize !== expectedCompressedSize) {
        throw new Error(`compressed size mismatch for stored file: ${rawEntry.compressedSize} != ${expectedCompressedSize}`);
      }
    }
    rawEntries.push(rawEntry);
  }
  const zip = {
    comment,
    commentBytes,
  };
  return {
    zip,
    entries: rawEntries.map(e => new ZipEntry(reader, e)),
  };
}

async function readEntryDataHeader(reader, rawEntry) {
  if (rawEntry.generalPurposeBitFlag & 0x1) {
    throw new Error('encrypted entries not supported');
  }
  const buffer = await readAs(reader, rawEntry.relativeOffsetOfLocalHeader, 30);
  // note: maybe this should be passed in or cached on entry
  // as it's async so there will be at least one tick (not sure about that)
  const totalLength = await reader.getLength();

  // 0 - Local file header signature = 0x04034b50
  const signature = getUint32LE(buffer, 0);
  if (signature !== 0x04034b50) {
    throw new Error(`invalid local file header signature: 0x${signature.toString(16)}`);
  }

  // all this should be redundant
  // 4 - Version needed to extract (minimum)
  // 6 - General purpose bit flag
  // 8 - Compression method
  // 10 - File last modification time
  // 12 - File last modification date
  // 14 - CRC-32
  // 18 - Compressed size
  // 22 - Uncompressed size
  // 26 - File name length (n)
  const fileNameLength = getUint16LE(buffer, 26);
  // 28 - Extra field length (m)
  const extraFieldLength = getUint16LE(buffer, 28);
  // 30 - File name
  // 30+n - Extra field
  const localFileHeaderEnd = rawEntry.relativeOffsetOfLocalHeader + buffer.length + fileNameLength + extraFieldLength;
  let decompress;
  if (rawEntry.compressionMethod === 0) {
    // 0 - The file is stored (no compression)
    decompress = false;
  } else if (rawEntry.compressionMethod === 8) {
    // 8 - The file is Deflated
    decompress = true;
  } else {
    throw new Error(`unsupported compression method: ${rawEntry.compressionMethod}`);
  }
  const fileDataStart = localFileHeaderEnd;
  const fileDataEnd = fileDataStart + rawEntry.compressedSize;
  if (rawEntry.compressedSize !== 0) {
    // bounds check now, because the read streams will probably not complain loud enough.
    // since we're dealing with an unsigned offset plus an unsigned size,
    // we only have 1 thing to check for.
    if (fileDataEnd > totalLength) {
      throw new Error(`file data overflows file bounds: ${fileDataStart} +  ${rawEntry.compressedSize}  > ${totalLength}`);
    }
  }
  return {
    decompress,
    fileDataStart,
  };
}

async function readEntryDataAsArrayBuffer(reader, rawEntry) {
  const {decompress, fileDataStart} = await readEntryDataHeader(reader, rawEntry);
  if (!decompress) {
    const dataView = await readAs(reader, fileDataStart, rawEntry.compressedSize);
    // make copy?
    //
    // 1. The source is a Blob/file. In this case we'll get back TypedArray we can just hand to the user
    // 2. The source is a TypedArray. In this case we'll get back TypedArray that is a view into a larger buffer
    //    but because ultimately this is used to return an ArrayBuffer to `someEntry.arrayBuffer()`
    //    we need to return copy since we need the `ArrayBuffer`, not the TypedArray to exactly match the data.
    //    Note: We could add another API function `bytes()` or something that returned a `Uint8Array`
    //    instead of an `ArrayBuffer`. This would let us skip a copy here. But this case only happens for uncompressed
    //    data. That seems like a rare enough case that adding a new API is not worth it? Or is it? A zip of jpegs or mp3s
    //    might not be compressed. For now that's a TBD.
    return isTypedArraySameAsArrayBuffer(dataView) ? dataView.buffer : dataView.slice().buffer;
  }
  // see comment in readEntryDateAsBlob
  const typedArrayOrBlob = await readAsBlobOrTypedArray(reader, fileDataStart, rawEntry.compressedSize);
  const result = await inflateRawAsync(typedArrayOrBlob, rawEntry.uncompressedSize);
  return result;
}

async function readEntryDataAsBlob(reader, rawEntry, type) {
  const {decompress, fileDataStart} = await readEntryDataHeader(reader, rawEntry);
  if (!decompress) {
    const typedArrayOrBlob = await readAsBlobOrTypedArray(reader, fileDataStart, rawEntry.compressedSize, type);
    if (isBlob(typedArrayOrBlob)) {
      return typedArrayOrBlob;
    }
    return new Blob([isSharedArrayBuffer(typedArrayOrBlob.buffer) ? new Uint8Array(typedArrayOrBlob) : typedArrayOrBlob], {type});
  }
  // Here's the issue with this mess (should refactor?)
  // if the source is a blob then we really want to pass a blob to inflateRawAsync to avoid a large
  // copy if we're going to a worker.
  const typedArrayOrBlob = await readAsBlobOrTypedArray(reader, fileDataStart, rawEntry.compressedSize);
  const result = await inflateRawAsync(typedArrayOrBlob, rawEntry.uncompressedSize, type);
  return result;
}

async function unzipRaw(source) {
  let reader;
  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    reader = new BlobReader(source);
  } else if (source instanceof ArrayBuffer || (source && source.buffer && source.buffer instanceof ArrayBuffer)) {
    reader = new ArrayBufferReader(source);
  } else if (isSharedArrayBuffer(source) || isSharedArrayBuffer(source.buffer)) {
    reader = new ArrayBufferReader(source);
  } else if (typeof source === 'string') {
    const req = await fetch(source);
    if (!req.ok) {
      throw new Error(`failed http request ${source}, status: ${req.status}: ${req.statusText}`);
    }
    const blob = await req.blob();
    reader = new BlobReader(blob);
  } else if (typeof source.getLength === 'function' && typeof source.read === 'function') {
    reader = source;
  } else {
    throw new Error('unsupported source type');
  }

  const totalLength = await reader.getLength();

  if (totalLength > Number.MAX_SAFE_INTEGER) {
    throw new Error(`file too large. size: ${totalLength}. Only file sizes up 4503599627370496 bytes are supported`);
  }

  return await findEndOfCentralDirector(reader, totalLength);
}

// If the names are not utf8 you should use unzipitRaw
async function unzip(source) {
  const {zip, entries} = await unzipRaw(source);
  return {
    zip,
    entries: Object.fromEntries(entries.map(v => [v.name, v])),
  };
}

// TODO: Document this
class FragmentsGroup extends THREE.Group {
    constructor() {
        super(...arguments);
        this.items = [];
        this.boundingBox = new THREE.Box3();
        this.coordinationMatrix = new THREE.Matrix4();
        // Keys are uints mapped with fragmentIDs to save memory
        this.keyFragments = new Map();
        // Map<expressID, [keys, rels]>
        // keys = fragmentKeys to which this asset belongs
        // rels = [floor, categoryid]
        this.data = new Map();
        // [geometryID, key]
        this.geometryIDs = {
            opaque: new Map(),
            transparent: new Map(),
        };
        this.ifcMetadata = {
            name: "",
            description: "",
            schema: "IFC2X3",
            maxExpressID: 0,
        };
        this.streamSettings = {
            baseUrl: "",
            baseFileName: "",
            ids: new Map(),
            types: new Map(),
        };
    }
    get hasProperties() {
        const hasLocalProps = this._properties !== undefined;
        const hasStreamProps = this.streamSettings.ids.size !== 0;
        return hasLocalProps || hasStreamProps;
    }
    getFragmentMap(expressIDs) {
        const fragmentMap = {};
        for (const expressID of expressIDs) {
            const data = this.data.get(expressID);
            if (!data)
                continue;
            for (const key of data[0]) {
                const fragmentID = this.keyFragments.get(key);
                if (fragmentID === undefined)
                    continue;
                if (!fragmentMap[fragmentID]) {
                    fragmentMap[fragmentID] = new Set();
                }
                fragmentMap[fragmentID].add(expressID);
            }
        }
        return fragmentMap;
    }
    dispose(disposeResources = true) {
        for (const fragment of this.items) {
            fragment.dispose(disposeResources);
        }
        this.coordinationMatrix = new THREE.Matrix4();
        this.keyFragments.clear();
        this.data.clear();
        this._properties = {};
        this.removeFromParent();
        this.items = [];
        if (this.civilData) {
            const { alignments } = this.civilData;
            for (const [_id, alignment] of alignments) {
                this.disposeAlignment(alignment.vertical);
                this.disposeAlignment(alignment.horizontal);
                this.disposeAlignment(alignment.absolute);
            }
        }
        this.civilData = undefined;
    }
    setLocalProperties(properties) {
        this._properties = properties;
    }
    getLocalProperties() {
        return this._properties;
    }
    getAllPropertiesIDs() {
        if (this._properties) {
            return Object.keys(this._properties).map((id) => parseInt(id, 10));
        }
        return Array.from(this.streamSettings.ids.keys());
    }
    getAllPropertiesTypes() {
        if (this._properties) {
            const types = new Set();
            for (const id in this._properties) {
                const property = this._properties[id];
                if (property.type !== undefined) {
                    types.add(property.type);
                }
            }
            return Array.from(types);
        }
        return Array.from(this.streamSettings.types.keys());
    }
    async getProperties(id) {
        if (this._properties) {
            return this._properties[id] || null;
        }
        const url = this.getPropsURL(id);
        const data = await this.getPropertiesData(url);
        return data ? data[id] : null;
    }
    async setProperties(id, value) {
        if (this._properties) {
            if (value !== null) {
                this._properties[id] = value;
            }
            else {
                delete this._properties[id];
            }
            return;
        }
        // TODO: Fix this
        const url = this.getPropsURL(id);
        const data = await this.getPropertiesData(url);
        if (value !== null) {
            data[id] = value;
        }
        else {
            delete data[id];
        }
        // TODO: Finish defining this
        const formData = new FormData();
        formData.append("file", JSON.stringify(data));
        await fetch("api/KJAKDSJFAKÑSDFJAÑSFJDAÑJFÑA", {
            body: formData,
            method: "post",
        });
    }
    async getAllPropertiesOfType(type) {
        if (this._properties) {
            const result = {};
            let found = false;
            for (const id in this._properties) {
                const item = this._properties[id];
                if (item.type === type) {
                    result[item.expressID] = item;
                    found = true;
                }
            }
            return found ? result : null;
        }
        const { types } = this.streamSettings;
        const fileIDs = types.get(type);
        if (fileIDs === undefined) {
            return null;
        }
        const result = {};
        for (const fileID of fileIDs) {
            const name = this.constructFileName(fileID);
            const url = this.constructURL(name);
            const data = await this.getPropertiesData(url);
            for (const key in data) {
                result[parseInt(key, 10)] = data[key];
            }
        }
        return result;
    }
    getPropsURL(id) {
        const { ids } = this.streamSettings;
        const fileID = ids.get(id);
        if (fileID === undefined) {
            throw new Error("ID not found");
        }
        const name = this.constructFileName(fileID);
        return this.constructURL(name);
    }
    async getPropertiesData(url) {
        const fetched = await fetch(url);
        const buffer = await fetched.arrayBuffer();
        const file = new File([new Blob([buffer])], "temp");
        const fileURL = URL.createObjectURL(file);
        const { entries } = await unzip(fileURL);
        const name = Object.keys(entries)[0];
        return entries[name].json();
    }
    constructFileName(fileID) {
        const { baseFileName } = this.streamSettings;
        return `${baseFileName}-${fileID}`;
    }
    constructURL(name) {
        const { baseUrl } = this.streamSettings;
        return `${baseUrl}${name}`;
    }
    disposeAlignment(alignment) {
        for (const curve of alignment) {
            curve.mesh.geometry.dispose();
            if (Array.isArray(curve.mesh.material)) {
                for (const mat of curve.mesh.material) {
                    mat.dispose();
                }
            }
            else {
                curve.mesh.material.dispose();
            }
        }
        alignment.length = 0;
    }
}

/**
 * Object to export and import sets of fragments efficiently using the library
 * [flatbuffers](https://flatbuffers.dev/).
 */
class Serializer {
    constructor() {
        this.fragmentIDSeparator = "|";
    }
    import(bytes) {
        const buffer = new ByteBuffer(bytes);
        const fbFragmentsGroup = FragmentsGroup$1.getRootAsFragmentsGroup(buffer);
        const fragmentsGroup = this.constructFragmentGroup(fbFragmentsGroup);
        const length = fbFragmentsGroup.itemsLength();
        for (let i = 0; i < length; i++) {
            const fbFragment = fbFragmentsGroup.items(i);
            if (!fbFragment)
                continue;
            const geometry = this.constructGeometry(fbFragment);
            const materials = this.constructMaterials(fbFragment);
            const capacity = fbFragment.capacity();
            const fragment = new Fragment$1(geometry, materials, capacity);
            fragment.capacityOffset = fbFragment.capacityOffset();
            this.setInstances(fbFragment, fragment);
            this.setID(fbFragment, fragment);
            fragmentsGroup.items.push(fragment);
            fragmentsGroup.add(fragment.mesh);
        }
        return fragmentsGroup;
    }
    export(group) {
        const builder = new Builder(1024);
        const items = [];
        const G = FragmentsGroup$1;
        const F = Fragment;
        let civilData = null;
        if (group.civilData) {
            const alignments = [];
            const A = Alignment;
            const C = CivilData;
            for (const [_id, alignment] of group.civilData.alignments) {
                const { absolute, horizontal, vertical } = alignment;
                const horCurves = this.saveCivilCurves(horizontal, builder);
                const verCurves = this.saveCivilCurves(vertical, builder);
                const absCurves = this.saveCivilCurves(absolute, builder);
                const horVector = A.createHorizontalVector(builder, horCurves);
                const verVector = A.createVerticalVector(builder, verCurves);
                const absVector = A.createAbsoluteVector(builder, absCurves);
                A.startAlignment(builder);
                A.addHorizontal(builder, horVector);
                A.addVertical(builder, verVector);
                A.addAbsolute(builder, absVector);
                A.addInitialPk(builder, alignment.initialKP);
                const exported = A.endAlignment(builder);
                alignments.push(exported);
            }
            const algVector = C.createAlignmentsVector(builder, alignments);
            const coordVector = C.createCoordinationMatrixVector(builder, group.coordinationMatrix.elements);
            C.startCivilData(builder);
            C.addAlignments(builder, algVector);
            C.addCoordinationMatrix(builder, coordVector);
            civilData = C.endCivilData(builder);
        }
        for (const fragment of group.items) {
            const result = fragment.exportData();
            const itemsSize = [];
            for (const itemID of fragment.ids) {
                const instances = fragment.getInstancesIDs(itemID);
                if (!instances) {
                    throw new Error("Instances not found!");
                }
                itemsSize.push(instances.size);
            }
            const posVector = F.createPositionVector(builder, result.position);
            const normalVector = F.createNormalVector(builder, result.normal);
            const indexVector = F.createIndexVector(builder, result.index);
            const groupsVector = F.createGroupsVector(builder, result.groups);
            const matsVector = F.createMaterialsVector(builder, result.materials);
            const matricesVector = F.createMatricesVector(builder, result.matrices);
            const colorsVector = F.createColorsVector(builder, result.colors);
            const idsVector = F.createIdsVector(builder, result.ids);
            const itemsSizeVector = F.createItemsSizeVector(builder, itemsSize);
            const idStr = builder.createString(result.id);
            F.startFragment(builder);
            F.addPosition(builder, posVector);
            F.addNormal(builder, normalVector);
            F.addIndex(builder, indexVector);
            F.addGroups(builder, groupsVector);
            F.addMaterials(builder, matsVector);
            F.addMatrices(builder, matricesVector);
            F.addColors(builder, colorsVector);
            F.addIds(builder, idsVector);
            F.addItemsSize(builder, itemsSizeVector);
            F.addId(builder, idStr);
            F.addCapacity(builder, fragment.capacity);
            F.addCapacityOffset(builder, fragment.capacityOffset);
            const exported = Fragment.endFragment(builder);
            items.push(exported);
        }
        const itemsVector = G.createItemsVector(builder, items);
        const matrixVector = G.createCoordinationMatrixVector(builder, group.coordinationMatrix.elements);
        let fragmentKeys = "";
        for (const fragmentID of group.keyFragments.values()) {
            if (fragmentKeys.length) {
                fragmentKeys += this.fragmentIDSeparator;
            }
            fragmentKeys += fragmentID;
        }
        const fragmentKeysRef = builder.createString(fragmentKeys);
        const keyIndices = [];
        const itemsKeys = [];
        const relsIndices = [];
        const itemsRels = [];
        const ids = [];
        let keysCounter = 0;
        let relsCounter = 0;
        for (const [expressID, [keys, rels]] of group.data) {
            keyIndices.push(keysCounter);
            relsIndices.push(relsCounter);
            ids.push(expressID);
            for (const key of keys) {
                itemsKeys.push(key);
            }
            for (const rel of rels) {
                itemsRels.push(rel);
            }
            keysCounter += keys.length;
            relsCounter += rels.length;
        }
        const opaqueIDs = [];
        const transpIDs = [];
        for (const [geometryID, key] of group.geometryIDs.opaque) {
            opaqueIDs.push(geometryID, key);
        }
        for (const [geometryID, key] of group.geometryIDs.transparent) {
            transpIDs.push(geometryID, key);
        }
        const groupID = builder.createString(group.uuid);
        const groupName = builder.createString(group.name);
        const ifcName = builder.createString(group.ifcMetadata.name);
        const ifcDescription = builder.createString(group.ifcMetadata.description);
        const ifcSchema = builder.createString(group.ifcMetadata.schema);
        const keysIVector = G.createItemsKeysIndicesVector(builder, keyIndices);
        const keysVector = G.createItemsKeysVector(builder, itemsKeys);
        const relsIVector = G.createItemsRelsIndicesVector(builder, relsIndices);
        const relsVector = G.createItemsRelsVector(builder, itemsRels);
        const idsVector = G.createIdsVector(builder, ids);
        const oIdsVector = G.createOpaqueGeometriesIdsVector(builder, opaqueIDs);
        const tIdsVector = G.createTransparentGeometriesIdsVector(builder, transpIDs);
        const { min, max } = group.boundingBox;
        const bbox = [min.x, min.y, min.z, max.x, max.y, max.z];
        const bboxVector = G.createBoundingBoxVector(builder, bbox);
        G.startFragmentsGroup(builder);
        G.addId(builder, groupID);
        G.addName(builder, groupName);
        G.addIfcName(builder, ifcName);
        G.addIfcDescription(builder, ifcDescription);
        G.addIfcSchema(builder, ifcSchema);
        G.addMaxExpressId(builder, group.ifcMetadata.maxExpressID);
        G.addItems(builder, itemsVector);
        G.addFragmentKeys(builder, fragmentKeysRef);
        G.addIds(builder, idsVector);
        G.addItemsKeysIndices(builder, keysIVector);
        G.addItemsKeys(builder, keysVector);
        G.addItemsRelsIndices(builder, relsIVector);
        G.addItemsRels(builder, relsVector);
        G.addCoordinationMatrix(builder, matrixVector);
        G.addBoundingBox(builder, bboxVector);
        G.addOpaqueGeometriesIds(builder, oIdsVector);
        G.addTransparentGeometriesIds(builder, tIdsVector);
        if (civilData !== null) {
            G.addCivil(builder, civilData);
        }
        const result = FragmentsGroup$1.endFragmentsGroup(builder);
        builder.finish(result);
        return builder.asUint8Array();
    }
    setID(fbFragment, fragment) {
        const id = fbFragment.id();
        if (id) {
            fragment.id = id;
            fragment.mesh.uuid = id;
        }
    }
    setInstances(fbFragment, fragment) {
        const matricesData = fbFragment.matricesArray();
        const colorData = fbFragment.colorsArray();
        const ids = fbFragment.idsArray();
        const itemsSize = fbFragment.itemsSizeArray();
        if (!matricesData || !ids || !itemsSize) {
            throw new Error(`Error: Can't load empty fragment!`);
        }
        const items = [];
        let offset = 0;
        for (let i = 0; i < itemsSize.length; i++) {
            const id = ids[i];
            const size = itemsSize[i];
            const transforms = [];
            const colorsArray = [];
            for (let j = 0; j < size; j++) {
                const mStart = offset * 16;
                const matrixArray = matricesData.subarray(mStart, mStart + 17);
                const transform = new THREE.Matrix4().fromArray(matrixArray);
                transforms.push(transform);
                if (colorData) {
                    const cStart = offset * 3;
                    const [r, g, b] = colorData.subarray(cStart, cStart + 4);
                    const color = new THREE.Color(r, g, b);
                    colorsArray.push(color);
                }
                offset++;
            }
            const colors = colorsArray.length ? colorsArray : undefined;
            items.push({ id, transforms, colors });
        }
        fragment.add(items);
    }
    constructMaterials(fragment) {
        const materials = fragment.materialsArray();
        const matArray = [];
        if (!materials)
            return matArray;
        for (let i = 0; i < materials.length; i += 5) {
            const opacity = materials[i];
            const transparent = Boolean(materials[i + 1]);
            const red = materials[i + 2];
            const green = materials[i + 3];
            const blue = materials[i + 4];
            const color = new THREE.Color(red, green, blue);
            const material = new THREE.MeshLambertMaterial({
                color,
                opacity,
                transparent,
            });
            matArray.push(material);
        }
        return matArray;
    }
    constructFragmentGroup(group) {
        const fragmentsGroup = new FragmentsGroup();
        const civil = group.civil();
        if (civil) {
            const matArray = civil.coordinationMatrixArray();
            const coordinationMatrix = new THREE.Matrix4();
            if (matArray) {
                coordinationMatrix.fromArray(matArray);
            }
            fragmentsGroup.civilData = { alignments: new Map(), coordinationMatrix };
            const aligLength = civil.alignmentsLength();
            for (let i = 0; i < aligLength; i++) {
                const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
                const aligData = civil.alignments(i);
                if (!aligData) {
                    throw new Error("Alignment not found!");
                }
                const horLength = aligData.horizontalLength();
                const horizontal = this.constructCivilCurves(aligData, "horizontal", horLength, lineMat);
                const verLength = aligData.verticalLength();
                const vertical = this.constructCivilCurves(aligData, "vertical", verLength, lineMat);
                const absLength = aligData.horizontalLength();
                const absolute = this.constructCivilCurves(aligData, "absolute", absLength, lineMat);
                const initialKP = aligData.initialPk();
                const alignment = {
                    horizontal,
                    vertical,
                    absolute,
                    initialKP,
                };
                fragmentsGroup.civilData.alignments.set(i, alignment);
            }
        }
        // fragmentsGroup.ifcCivil?.horizontalAlignments
        fragmentsGroup.uuid = group.id() || fragmentsGroup.uuid;
        fragmentsGroup.name = group.name() || "";
        fragmentsGroup.ifcMetadata = {
            name: group.ifcName() || "",
            description: group.ifcDescription() || "",
            schema: group.ifcSchema() || "IFC2X3",
            maxExpressID: group.maxExpressId() || 0,
        };
        const defaultMatrix = new THREE.Matrix4().elements;
        const matrixArray = group.coordinationMatrixArray() || defaultMatrix;
        const ids = group.idsArray() || new Uint32Array();
        const keysIndices = group.itemsKeysIndicesArray() || new Uint32Array();
        const keysArray = group.itemsKeysArray() || new Uint32Array();
        const relsArray = group.itemsRelsArray() || new Uint32Array();
        const relsIndices = group.itemsRelsIndicesArray() || new Uint32Array();
        const keysIdsString = group.fragmentKeys() || "";
        const keysIdsArray = keysIdsString.split(this.fragmentIDSeparator);
        this.setGroupData(fragmentsGroup, ids, keysIndices, keysArray, 0);
        this.setGroupData(fragmentsGroup, ids, relsIndices, relsArray, 1);
        const opaqueIDs = group.opaqueGeometriesIdsArray() || new Uint32Array();
        const transpIDs = group.transparentGeometriesIdsArray() || new Uint32Array();
        const opaque = new Map();
        for (let i = 0; i < opaqueIDs.length - 1; i += 2) {
            const geometryID = opaqueIDs[i];
            const key = opaqueIDs[i + 1];
            opaque.set(geometryID, key);
        }
        const transparent = new Map();
        for (let i = 0; i < transpIDs.length - 1; i += 2) {
            const geometryID = transpIDs[i];
            const key = transpIDs[i + 1];
            transparent.set(geometryID, key);
        }
        fragmentsGroup.geometryIDs = { opaque, transparent };
        const bbox = group.boundingBoxArray() || [0, 0, 0, 0, 0, 0];
        const [minX, minY, minZ, maxX, maxY, maxZ] = bbox;
        fragmentsGroup.boundingBox.min.set(minX, minY, minZ);
        fragmentsGroup.boundingBox.max.set(maxX, maxY, maxZ);
        for (let i = 0; i < keysIdsArray.length; i++) {
            fragmentsGroup.keyFragments.set(i, keysIdsArray[i]);
        }
        if (matrixArray.length === 16) {
            fragmentsGroup.coordinationMatrix.fromArray(matrixArray);
        }
        return fragmentsGroup;
    }
    setGroupData(group, ids, indices, array, index) {
        for (let i = 0; i < indices.length; i++) {
            const expressID = ids[i];
            const currentIndex = indices[i];
            const nextIndex = indices[i + 1] || array.length;
            const keys = [];
            for (let j = currentIndex; j < nextIndex; j++) {
                keys.push(array[j]);
            }
            if (!group.data.has(expressID)) {
                group.data.set(expressID, [[], []]);
            }
            const data = group.data.get(expressID);
            if (!data)
                continue;
            data[index] = keys;
        }
    }
    constructGeometry(fragment) {
        const position = fragment.positionArray() || new Float32Array();
        const normal = fragment.normalArray() || new Float32Array();
        const index = fragment.indexArray();
        const groups = fragment.groupsArray();
        if (!index)
            throw new Error("Index not found!");
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(Array.from(index));
        geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
        geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
        if (groups) {
            for (let i = 0; i < groups.length; i += 3) {
                const start = groups[i];
                const count = groups[i + 1];
                const materialIndex = groups[i + 2];
                geometry.addGroup(start, count, materialIndex);
            }
        }
        return geometry;
    }
    constructCivilCurves(alignData, option, length, lineMat) {
        const curves = [];
        for (let i = 0; i < length; i++) {
            const found = alignData[option](i);
            if (!found) {
                throw new Error("Curve not found!");
            }
            const points = found.pointsArray();
            if (points === null) {
                throw new Error("Curve points not found!");
            }
            let data = {};
            const curveData = found.data();
            if (curveData) {
                data = JSON.parse(curveData);
            }
            const geometry = new THREE.EdgesGeometry();
            const posAttr = new THREE.BufferAttribute(points, 3);
            geometry.setAttribute("position", posAttr);
            const index = [];
            for (let i = 0; i < points.length / 3 - 1; i++) {
                index.push(i, i + 1);
            }
            geometry.setIndex(index);
            const mesh = new THREE.LineSegments(geometry, lineMat);
            curves.push({ data, mesh });
        }
        return curves;
    }
    saveCivilCurves(curves, builder) {
        const CC = CivilCurve;
        const curvesRef = [];
        for (const curve of curves) {
            const attrs = curve.mesh.geometry.attributes;
            const position = attrs.position.array;
            const posVector = CC.createPointsVector(builder, position);
            const dataStr = builder.createString(JSON.stringify(curve.data));
            CC.startCivilCurve(builder);
            CC.addPoints(builder, posVector);
            CC.addData(builder, dataStr);
            const exported = CC.endCivilCurve(builder);
            curvesRef.push(exported);
        }
        return curvesRef;
    }
}

// automatically generated by the FlatBuffers compiler, do not modify
class StreamedGeometry {
    constructor() {
        this.bb = null;
        this.bb_pos = 0;
    }
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsStreamedGeometry(bb, obj) {
        return (obj || new StreamedGeometry()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsStreamedGeometry(bb, obj) {
        bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
        return (obj || new StreamedGeometry()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    geometryId() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    position(index) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    positionLength() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    positionArray() {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    normal(index) {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    normalLength() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    normalArray() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    index(index) {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    indexLength() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    indexArray() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    static startStreamedGeometry(builder) {
        builder.startObject(4);
    }
    static addGeometryId(builder, geometryId) {
        builder.addFieldInt32(0, geometryId, 0);
    }
    static addPosition(builder, positionOffset) {
        builder.addFieldOffset(1, positionOffset, 0);
    }
    static createPositionVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startPositionVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addNormal(builder, normalOffset) {
        builder.addFieldOffset(2, normalOffset, 0);
    }
    static createNormalVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startNormalVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addIndex(builder, indexOffset) {
        builder.addFieldOffset(3, indexOffset, 0);
    }
    static createIndexVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startIndexVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endStreamedGeometry(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static createStreamedGeometry(builder, geometryId, positionOffset, normalOffset, indexOffset) {
        StreamedGeometry.startStreamedGeometry(builder);
        StreamedGeometry.addGeometryId(builder, geometryId);
        StreamedGeometry.addPosition(builder, positionOffset);
        StreamedGeometry.addNormal(builder, normalOffset);
        StreamedGeometry.addIndex(builder, indexOffset);
        return StreamedGeometry.endStreamedGeometry(builder);
    }
}

// automatically generated by the FlatBuffers compiler, do not modify
class StreamedGeometries {
    constructor() {
        this.bb = null;
        this.bb_pos = 0;
    }
    __init(i, bb) {
        this.bb_pos = i;
        this.bb = bb;
        return this;
    }
    static getRootAsStreamedGeometries(bb, obj) {
        return (obj || new StreamedGeometries()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsStreamedGeometries(bb, obj) {
        bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
        return (obj || new StreamedGeometries()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    geometries(index, obj) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? (obj || new StreamedGeometry()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    geometriesLength() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    static startStreamedGeometries(builder) {
        builder.startObject(1);
    }
    static addGeometries(builder, geometriesOffset) {
        builder.addFieldOffset(0, geometriesOffset, 0);
    }
    static createGeometriesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startGeometriesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static endStreamedGeometries(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static finishStreamedGeometriesBuffer(builder, offset) {
        builder.finish(offset);
    }
    static finishSizePrefixedStreamedGeometriesBuffer(builder, offset) {
        builder.finish(offset, undefined, true);
    }
    static createStreamedGeometries(builder, geometriesOffset) {
        StreamedGeometries.startStreamedGeometries(builder);
        StreamedGeometries.addGeometries(builder, geometriesOffset);
        return StreamedGeometries.endStreamedGeometries(builder);
    }
}

class StreamSerializer {
    import(bytes) {
        const buffer = new ByteBuffer(bytes);
        const fbGeoms = StreamedGeometries.getRootAsStreamedGeometries(buffer);
        const geometries = new Map();
        const length = fbGeoms.geometriesLength();
        for (let i = 0; i < length; i++) {
            const fbGeom = fbGeoms.geometries(i);
            if (!fbGeom)
                continue;
            const id = fbGeom.geometryId();
            if (id === null) {
                throw new Error("Error finding ID!");
            }
            const position = fbGeom.positionArray();
            const normal = fbGeom.normalArray();
            const index = fbGeom.indexArray();
            if (!position || !normal || !index) {
                continue;
            }
            geometries.set(id, { position, normal, index });
        }
        return geometries;
    }
    export(geometries) {
        const builder = new Builder(1024);
        const createdGeoms = [];
        const Gs = StreamedGeometries;
        const G = StreamedGeometry;
        for (const [id, { index, position, normal }] of geometries) {
            const indexVector = G.createIndexVector(builder, index);
            const posVector = G.createPositionVector(builder, position);
            const norVector = G.createNormalVector(builder, normal);
            G.startStreamedGeometry(builder);
            G.addGeometryId(builder, id);
            G.addIndex(builder, indexVector);
            G.addPosition(builder, posVector);
            G.addNormal(builder, norVector);
            const created = G.endStreamedGeometry(builder);
            createdGeoms.push(created);
        }
        const allGeoms = Gs.createGeometriesVector(builder, createdGeoms);
        Gs.startStreamedGeometries(builder);
        Gs.addGeometries(builder, allGeoms);
        const result = Gs.endStreamedGeometries(builder);
        builder.finish(result);
        return builder.asUint8Array();
    }
}

export { Fragment$1 as Fragment, FragmentMesh, FragmentsGroup, Serializer, StreamSerializer };
