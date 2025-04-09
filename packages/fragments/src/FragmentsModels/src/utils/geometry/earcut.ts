/* eslint-disable no-multi-assign */
/* eslint-disable no-use-before-define */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-bitwise */

// src: https://github.com/mapbox/earcut/

export function earcut(
  data: any,
  holeIndices: any,
  dim: any,
  a: any,
  b: any,
  createGeometry: any,
) {
  const hasHoles = holeIndices && holeIndices.length;
  const outerLen = hasHoles ? holeIndices[0] * dim : data.length;
  let outerNode = linkedList(data, 0, outerLen, dim, true, a, b);

  if (!outerNode || outerNode.next === outerNode.prev) return;

  let minX;
  let minY;
  let invSize;

  if (hasHoles)
    outerNode = eliminateHoles(data, holeIndices, outerNode, dim, a, b);

  // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox
  if (data.length > 80 * dim) {
    let maxX = data[a];
    let maxY = data[b];
    minX = maxX;
    minY = maxY;

    for (let i = dim; i < outerLen; i += dim) {
      const x = data[i + a];
      const y = data[i + b];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    // minX, minY and invSize are later used to transform coords into integers for z-order calculation
    invSize = Math.max(maxX - minX, maxY - minY);
    invSize = invSize !== 0 ? 1 / invSize : 0;
  }

  earcutLinked(outerNode, createGeometry, dim, minX, minY, invSize);
}

// create a circular doubly linked list from polygon points in the specified winding order
function linkedList(
  data: any,
  start: any,
  end: any,
  dim: any,
  clockwise: any,
  a: any,
  b: any,
) {
  let finish;
  let current;
  let counter;

  if (clockwise === signedArea(data, start, end, dim, a, b) > 0) {
    for (counter = start; counter < end; counter += dim)
      finish = insertNode(
        counter,
        data[counter + a],
        data[counter + b],
        finish,
      );
  } else {
    for (counter = end - dim; counter >= start; counter -= dim)
      finish = insertNode(
        counter,
        data[counter + a],
        data[counter + b],
        finish,
      );
  }

  if (finish && equals(finish, finish.next)) {
    current = finish.next;
    removeNode(finish);
    finish = current;
  }

  return finish;
}

// eliminate colinear or duplicate points
function filterPoints(start: any, end?: any) {
  if (!start) return start;
  if (!end) end = start;

  let p = start;
  let again;
  let past;
  do {
    again = false;

    if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
      past = p.prev;
      removeNode(p);
      p = end = past;
      if (p === p.next) break;
      again = true;
    } else {
      p = p.next;
    }
  } while (again || p !== end);

  return end;
}

// main ear slicing loop which triangulates a polygon (given as a linked list)
function earcutLinked(
  ear: any,
  createGeometry: any,
  dim: any,
  minX: any,
  minY: any,
  invSize: any,
  pass?: any,
) {
  // interlink polygon nodes in z-order
  if (!pass && invSize) indexCurve(ear, minX, minY, invSize);

  let stop = ear;

  // iterate through ears, slicing them one by one
  while (ear.prev !== ear.next) {
    const prev = ear.prev;
    const next = ear.next;

    if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
      // cut off the triangle
      createGeometry(prev.i / dim, ear.i / dim, next.i / dim);

      removeNode(ear);

      // skipping the next vertex leads to less sliver triangles
      ear = next.next;
      stop = next.next;

      continue;
    }

    ear = next;

    // if we looped through the whole remaining polygon and can't find any more ears
    if (ear === stop) {
      // try filtering points and slicing again
      if (!pass) {
        earcutLinked(
          filterPoints(ear),
          createGeometry,
          dim,
          minX,
          minY,
          invSize,
          1,
        );

        // if this didn't work, try curing all small self-intersections locally
      } else if (pass === 1) {
        ear = cureLocalIntersections(filterPoints(ear), createGeometry, dim);
        earcutLinked(ear, createGeometry, dim, minX, minY, invSize, 2);

        // as a last resort, try splitting the remaining polygon into two
      } else if (pass === 2) {
        splitEarcut(ear, createGeometry, dim, minX, minY, invSize);
      }

      break;
    }
  }
}

// check whether a polygon node forms a valid ear with adjacent nodes
function isEar(ear: any) {
  const a = ear.prev;
  const b = ear;
  const c = ear.next;

  // reflex, can't be an ear
  if (area(a, b, c) >= 0) return false;

  // now make sure we don't have other points inside the potential ear
  let p = ear.next.next;

  while (p !== ear.prev) {
    if (
      pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
      area(p.prev, p, p.next) >= 0
    )
      return false;
    p = p.next;
  }

  return true;
}

function isEarHashed(ear: any, minX: any, minY: any, invSize: any) {
  const a = ear.prev;
  const b = ear;
  const c = ear.next;

  // reflex, can't be an ear
  if (area(a, b, c) >= 0) return false;

  // triangle bbox
  const x0 = Math.min(a.x, b.x, c.x);
  const y0 = Math.min(a.y, b.y, c.y);
  const x1 = Math.max(a.x, b.x, c.x);
  const y1 = Math.max(a.y, b.y, c.y);

  // z-order range for the current triangle bbox
  const minZ = zOrder(x0, y0, minX, minY, invSize);
  const maxZ = zOrder(x1, y1, minX, minY, invSize);

  let p = ear.prevZ;
  let n = ear.nextZ;

  // look for points inside the triangle in both directions
  while (p && p.z >= minZ && n && n.z <= maxZ) {
    if (
      p !== ear.prev &&
      p !== ear.next &&
      pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
      area(p.prev, p, p.next) >= 0
    )
      return false;
    p = p.prevZ;

    if (
      n !== ear.prev &&
      n !== ear.next &&
      pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
      area(n.prev, n, n.next) >= 0
    )
      return false;
    n = n.nextZ;
  }

  // look for remaining points in decreasing z-order
  while (p && p.z >= minZ) {
    if (
      p !== ear.prev &&
      p !== ear.next &&
      pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
      area(p.prev, p, p.next) >= 0
    )
      return false;
    p = p.prevZ;
  }

  // look for remaining points in increasing z-order
  while (n && n.z <= maxZ) {
    if (
      n !== ear.prev &&
      n !== ear.next &&
      pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
      area(n.prev, n, n.next) >= 0
    )
      return false;
    n = n.nextZ;
  }

  return true;
}

// go through all polygon nodes and cure small local self-intersections
function cureLocalIntersections(start: any, createGeometry: any, dim: any) {
  let p = start;
  do {
    const a = p.prev;
    const b = p.next.next;

    if (
      !equals(a, b) &&
      intersects(a, p, p.next, b) &&
      locallyInside(a, b) &&
      locallyInside(b, a)
    ) {
      createGeometry(a.i / dim, p.i / dim, b.i / dim);

      // remove two nodes involved
      removeNode(p.next);
      removeNode(p);

      p = start = b;
    }
    p = p.next;
  } while (p !== start);

  return filterPoints(p);
}

// try splitting polygon into two and triangulate them independently
function splitEarcut(
  start: any,
  createGeometry: any,
  dim: any,
  minX: any,
  minY: any,
  invSize: any,
) {
  // look for a valid diagonal that divides the polygon into two
  let a = start;
  do {
    let b = a.next.next;
    while (b !== a.prev) {
      if (a.i !== b.i && isValidDiagonal(a, b)) {
        // split the polygon in two by the diagonal
        let c = splitPolygon(a, b);

        // filter colinear points around the cuts
        a = filterPoints(a, a.next);
        c = filterPoints(c, c.next);

        // run earcut on each half
        earcutLinked(a, createGeometry, dim, minX, minY, invSize);
        earcutLinked(c, createGeometry, dim, minX, minY, invSize);
        return;
      }
      b = b.next;
    }
    a = a.next;
  } while (a !== start);
}

// link every hole into the outer loop, producing a single-ring polygon without holes
function eliminateHoles(
  data: any,
  holeIndices: any,
  outerNode: any,
  dim: any,
  a: any,
  b: any,
) {
  const queue = [];

  for (let i = 0, len = holeIndices.length; i < len; i++) {
    const start = holeIndices[i] * dim;
    const end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
    const list = linkedList(data, start, end, dim, false, a, b);
    if (list === list.next) list.steiner = true;
    queue.push(getLeftmost(list));
  }

  queue.sort(xDifference);

  // process holes from left to right
  for (let i = 0; i < queue.length; i++) {
    outerNode = eliminateHole(queue[i], outerNode);
    outerNode = filterPoints(outerNode, outerNode.next);
  }

  return outerNode;
}

function xDifference(a: any, b: any) {
  return a.x - b.x;
}

// find a bridge between vertices that connects hole with an outer ring and and link it
function eliminateHole(hole: any, outerNode: any) {
  const bridge = findHoleBridge(hole, outerNode);
  if (!bridge) {
    return outerNode;
  }

  const bridgeReverse = splitPolygon(bridge, hole);

  // filter collinear points around the cuts
  const filtered = filterPoints(bridge, bridge.next);
  filterPoints(bridgeReverse, bridgeReverse.next);
  if (outerNode === outerNode.next || bridge === outerNode) {
    return filtered;
  }

  return outerNode;
}

// david eberly's algorithm for finding a bridge between hole and outer polygon
function findHoleBridge(hole: any, outerNode: any) {
  let p = outerNode;
  const hx = hole.x;
  const hy = hole.y;
  let qx = -Infinity;
  let m;

  // find a segment intersected by a ray from the hole's leftmost point to the left
  // segment's endpoint with lesser x will be potential connection point
  do {
    if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
      const x = p.x + ((hy - p.y) * (p.next.x - p.x)) / (p.next.y - p.y);
      if (x <= hx && x > qx) {
        qx = x;
        if (x === hx) {
          if (hy === p.y) return p;
          if (hy === p.next.y) return p.next;
        }
        m = p.x < p.next.x ? p : p.next;
      }
    }
    p = p.next;
  } while (p !== outerNode);

  if (!m) return null;

  // hole touches outer segment; pick leftmost endpoint
  if (hx === qx) return m;

  // look for points inside the triangle of hole point, segment intersection and endpoint
  // if there are no points found, we have a valid connection
  // otherwise choose the point of the minimum angle with the ray as connection point

  const stop = m;
  const mx = m.x;
  const my = m.y;
  let tanMin = Infinity;

  p = m;

  do {
    if (
      hx >= p.x &&
      p.x >= mx &&
      hx !== p.x &&
      pointInTriangle(
        hy < my ? hx : qx,
        hy,
        mx,
        my,
        hy < my ? qx : hx,
        hy,
        p.x,
        p.y,
      )
    ) {
      // tangential
      const tan = Math.abs(hy - p.y) / (hx - p.x);

      if (
        locallyInside(p, hole) &&
        (tan < tanMin ||
          (tan === tanMin &&
            (p.x > m.x || (p.x === m.x && sectorContainsSector(m, p)))))
      ) {
        m = p;
        tanMin = tan;
      }
    }
    p = p.next;
  } while (p !== stop);

  return m;
}

// whether sector in vertex m contains sector in vertex p in the same coordinates
function sectorContainsSector(m: any, p: any) {
  return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
}

// interlink polygon nodes in z-order
function indexCurve(start: any, minX: any, minY: any, invSize: any) {
  let p = start;
  do {
    if (p.z === null) p.z = zOrder(p.x, p.y, minX, minY, invSize);
    p.prevZ = p.prev;
    p.nextZ = p.next;
    p = p.next;
  } while (p !== start);

  p.prevZ.nextZ = null;
  p.prevZ = null;

  sortLinked(p);
}

// simon tatham's linked list merge sort algorithm
// http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html
function sortLinked(list: any) {
  let inSize = 1;
  let numMerges;

  do {
    let p = list;
    let e;
    list = null;
    let tail = null;
    numMerges = 0;

    while (p) {
      numMerges++;
      let q = p;
      let pSize = 0;
      for (let i = 0; i < inSize; i++) {
        pSize++;
        q = q.nextZ;
        if (!q) break;
      }
      let qSize = inSize;

      while (pSize > 0 || (qSize > 0 && q)) {
        if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
          e = p;
          p = p.nextZ;
          pSize--;
        } else {
          e = q;
          q = q.nextZ;
          qSize--;
        }

        if (tail) tail.nextZ = e;
        else list = e;

        e.prevZ = tail;
        tail = e;
      }

      p = q;
    }

    tail.nextZ = null;
    inSize *= 2;
  } while (numMerges > 1);

  return list;
}

// z-order of a point given coords and inverse of the longer side of data bbox
function zOrder(x: any, y: any, minX: any, minY: any, invSize: any) {
  // coords are transformed into non-negative 15-bit integer range
  x = 32767 * (x - minX) * invSize;
  y = 32767 * (y - minY) * invSize;

  x = (x | (x << 8)) & 0x00ff00ff;
  x = (x | (x << 4)) & 0x0f0f0f0f;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;

  y = (y | (y << 8)) & 0x00ff00ff;
  y = (y | (y << 4)) & 0x0f0f0f0f;
  y = (y | (y << 2)) & 0x33333333;
  y = (y | (y << 1)) & 0x55555555;

  return x | (y << 1);
}

// find the leftmost node of a polygon ring
function getLeftmost(start: any) {
  let p = start;
  let leftmost = start;
  do {
    if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y))
      leftmost = p;
    p = p.next;
  } while (p !== start);

  return leftmost;
}

// check if a point lies within a convex triangle
function pointInTriangle(
  ax: any,
  ay: any,
  bx: any,
  by: any,
  cx: any,
  cy: any,
  px: any,
  py: any,
) {
  return (
    (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
    (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
    (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0
  );
}

// check if a diagonal between two polygon nodes is valid (lies in polygon interior)
function isValidDiagonal(a: any, b: any) {
  return (
    a.next.i !== b.i &&
    a.prev.i !== b.i &&
    !intersectsPolygon(a, b) && // dones't intersect other edges
    ((locallyInside(a, b) &&
      locallyInside(b, a) &&
      middleInside(a, b) && // locally visible
      (area(a.prev, a, b.prev) || area(a, b.prev, b))) || // does not create opposite-facing sectors
      (equals(a, b) &&
        area(a.prev, a, a.next) > 0 &&
        area(b.prev, b, b.next) > 0))
  ); // special zero-length case
}

// signed area of a triangle
function area(p: any, q: any, r: any) {
  return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

// check if two points are equal
function equals(p1: any, p2: any) {
  return p1.x === p2.x && p1.y === p2.y;
}

// check if two segments intersect
function intersects(p1: any, q1: any, p2: any, q2: any) {
  const o1 = sign(area(p1, q1, p2));
  const o2 = sign(area(p1, q1, q2));
  const o3 = sign(area(p2, q2, p1));
  const o4 = sign(area(p2, q2, q1));

  if (o1 !== o2 && o3 !== o4) return true; // general case

  if (o1 === 0 && onSegment(p1, p2, q1)) return true; // p1, q1 and p2 are collinear and p2 lies on p1q1
  if (o2 === 0 && onSegment(p1, q2, q1)) return true; // p1, q1 and q2 are collinear and q2 lies on p1q1
  if (o3 === 0 && onSegment(p2, p1, q2)) return true; // p2, q2 and p1 are collinear and p1 lies on p2q2
  if (o4 === 0 && onSegment(p2, q1, q2)) return true; // p2, q2 and q1 are collinear and q1 lies on p2q2

  return false;
}

// for collinear points p, q, r, check if point q lies on segment pr
function onSegment(p: any, q: any, r: any) {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
}

function sign(num: any) {
  return num > 0 ? 1 : num < 0 ? -1 : 0;
}

// check if a polygon diagonal intersects any polygon segments
function intersectsPolygon(a: any, b: any) {
  let p = a;
  do {
    if (
      p.i !== a.i &&
      p.next.i !== a.i &&
      p.i !== b.i &&
      p.next.i !== b.i &&
      intersects(p, p.next, a, b)
    )
      return true;
    p = p.next;
  } while (p !== a);

  return false;
}

// check if a polygon diagonal is locally inside the polygon
function locallyInside(a: any, b: any) {
  return area(a.prev, a, a.next) < 0
    ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0
    : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}

// check if the middle point of a polygon diagonal is inside the polygon
function middleInside(a: any, b: any) {
  let p = a;
  let inside = false;
  const px = (a.x + b.x) / 2;
  const py = (a.y + b.y) / 2;
  do {
    if (
      p.y > py !== p.next.y > py &&
      p.next.y !== p.y &&
      px < ((p.next.x - p.x) * (py - p.y)) / (p.next.y - p.y) + p.x
    )
      inside = !inside;
    p = p.next;
  } while (p !== a);

  return inside;
}

// link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two
// if one belongs to the outer ring and another to a hole, it merges it into a single ring
function splitPolygon(a: any, b: any) {
  // @ts-ignore
  const a2 = createNode(a.i, a.x, a.y);
  // @ts-ignore
  const b2 = createNode(b.i, b.x, b.y);

  const an = a.next;
  const bp = b.prev;

  a.next = b;
  b.prev = a;

  a2.next = an;
  an.prev = a2;

  b2.next = a2;
  a2.prev = b2;

  bp.next = b2;
  b2.prev = bp;

  return b2;
}

// create a node and optionally link it with previous one (in a circular doubly linked list)
function insertNode(i: any, x: any, y: any, last: any) {
  // @ts-ignore
  const p = createNode(i, x, y);

  if (!last) {
    p.prev = p;
    p.next = p;
  } else {
    p.next = last.next;
    p.prev = last;
    last.next.prev = p;
    last.next = p;
  }
  return p;
}

function removeNode(p: any) {
  p.next.prev = p.prev;
  p.prev.next = p.next;
  if (p.prevZ) p.prevZ.nextZ = p.nextZ;
  if (p.nextZ) p.nextZ.prevZ = p.prevZ;
  p.next = p;
  p.prev = p;
}

function createNode(i: any, x: any, y: any) {
  return {
    i, // vertex index in coordinates array
    x,
    y, // vertex coordinates
    prev: null as any, // previous and next vertex nodes in a polygon ring
    next: null as any,
    z: null as any, // z-order curve value
    prevZ: null as any, // previous and next nodes in z-order
    nextZ: null as any,
    steiner: false as any, // indicates whether this is a steiner point
  };
}

function signedArea(data: any, start: any, end: any, dim: any, a: any, b: any) {
  let sum = 0;
  for (let i = start, j = end - dim; i < end; i += dim) {
    sum += (data[j + a] - data[i + a]) * (data[i + b] + data[j + b]);
    j = i;
  }
  return sum;
}
