uniform sampler2D uTexture;

varying vec2 vUv;

void main(){
    vec2 uv = gl_PointCoord;
    vec4 texColor = texture2D(uTexture, vUv);
    float distanceToCenter = distance(uv, vec2(0.5));
    float alpha = 0.05/distanceToCenter - 0.1;
    gl_FragColor = vec4(texColor.rgb, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}