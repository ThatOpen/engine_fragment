export class LodShaders {
  static vertex = `
            #include <common>
            #include <clipping_planes_pars_vertex>

            attribute float itemFilter;
            uniform vec2 lodSize;
            attribute vec3 itemFirst;
            attribute vec3 itemLast;

            float lodWidth = 2.0;
            
            void cutLodLine(const in vec4 first, inout vec4 second ) {
                float projValue1 = projectionMatrix[2][2];
                float projValue2 = projectionMatrix[3][2];
                float approxResult = -(projValue2 / projValue1) / 2.0;
                float diff1 = approxResult - first.z;
                float diff2 = second.z - first.z;
                float cutFilter = diff1 / diff2;
                second.xyz = mix(first.xyz, second.xyz, cutFilter);
            }
                
            void main() {
                if (itemFilter == 0.0) {
                    gl_Position = vec4(0,0,0,0);
                    return;
                }

                vec4 rawFirst = vec4(itemFirst, 1.0);
                vec4 rawLast = vec4(itemLast, 1.0);
                vec4 first = modelViewMatrix * rawFirst;
                vec4 last = modelViewMatrix * rawLast;
                
                bool lodPerspective = projectionMatrix[2][3] == -1.0;
                if (lodPerspective) {
                    bool firstCut = first.z < 0.0 && last.z >= 0.0;
                    bool lastCut = last.z < 0.0 && first.z >= 0.0;
                    if (firstCut) {
                        cutLodLine( first, last );
                    } else if (lastCut) {
                        cutLodLine( last, first );
                    }
                }

                vec4 firstCut = projectionMatrix * first;
                vec4 lastCut = projectionMatrix * last;
                vec3 firstNdc = firstCut.xyz / firstCut.w;
                vec3 lastNdc = lastCut.xyz / lastCut.w;

                vec2 lodOrientation = lastNdc.xy - firstNdc.xy;

                float lodRatio = lodSize.x / lodSize.y;
                lodOrientation.x *= lodRatio;
                lodOrientation = normalize(lodOrientation);
                
                vec2 lodDistance = vec2(lodOrientation.y, - lodOrientation.x);
                lodOrientation.x /= lodRatio;
                lodDistance.x /= lodRatio;

                if (position.x < 0.0) { 
                    lodDistance *= - 1.0;
                }

                if (position.y < 0.0) {
                    lodDistance += -lodOrientation;
                } else if (position.y > 1.0) {
                    lodDistance += lodOrientation;
                }

                lodDistance *= lodWidth;
                lodDistance /= lodSize.y;

                bool isFirst = position.y < 0.5;
                vec4 lodPosition = isFirst ? firstCut : lastCut;
                lodDistance *= lodPosition.w;
                lodPosition.xy += lodDistance;
                gl_Position = lodPosition;

                vec4 mvPosition = isFirst ? first : last;
                #include <clipping_planes_vertex>
            }
    `;

  static fragment = `
            #include <common>
            #include <clipping_planes_pars_fragment>

            uniform vec3 lodColor;
            uniform float lodOpacity;

            void main() {
                #include <clipping_planes_fragment>
                gl_FragColor = vec4(lodColor, lodOpacity);
                #include <colorspace_fragment>
            }
    `;
}
