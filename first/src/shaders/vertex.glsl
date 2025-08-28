attribute vec3 aPosition;
uniform float uProgress;
uniform vec2 uResolution;
uniform float uSize;

void main() {
    vec3 mixPos = mix(aPosition, position, uProgress);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(mixPos, 1.0);
    gl_PointSize = uSize * uResolution.y;
    gl_PointSize *= 1.0/gl_Position.z;
    
}