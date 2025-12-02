import * as THREE from 'three';
import Mesh from './Mesh.js';

export class Skybox extends Mesh {
    /**
     * options:
     *  - size: outer size of box (default 500)
     *  - color: fallback color (hex or css) when no images provided
     *  - images: optional array of 6 image URLs in order: [px, nx, py, ny, pz, nz]
     *  - useCubeTextureBackground: if true and images provided, you can call applyAsBackground(scene) to set scene.background
     */
    constructor({ size = 500, color = 0x87CEEB, images = null, useCubeTextureBackground = false, name = '' } = {}) {
        super({ name });
        this.size = size;
        this.color = color;
        this.images = images;
        this.useCubeTextureBackground = useCubeTextureBackground;

        this._createMesh();
    }

    _createMesh() {
        const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
        let createdMesh = null;
        if (this.images && Array.isArray(this.images) && this.images.length === 6) {
            const loader = new THREE.TextureLoader();
            const materials = this.images.map((url) => {
                const tex = loader.load(url);
                const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide });
                return mat;
            });
            createdMesh = new THREE.Mesh(geometry, materials);
        } else {
            const mat = new THREE.MeshBasicMaterial({ color: this.color, side: THREE.BackSide });
            createdMesh = new THREE.Mesh(geometry, mat);
        }

        createdMesh.frustumCulled = false;
        this.setMesh(createdMesh);
    }

    applyAsBackground(scene) {
        if (!this.images || this.images.length !== 6) return this;
        const loader = new THREE.CubeTextureLoader();
        const cubeTex = loader.load(this.images);
        cubeTex.encoding = THREE.sRGBEncoding;
        scene.background = cubeTex;
        this._backgroundTexture = cubeTex;
        return this;
    }

    setImages(imagesArray) { this.images = imagesArray; this._createMesh(); return this; }
    setColor(color) { this.color = color; if (!this.images) { if (this.mesh && this.mesh.material) { if (Array.isArray(this.mesh.material)) { this.mesh.material.forEach(m => m.color && m.color.set(color)); } else { this.mesh.material.color && this.mesh.material.color.set(color); } } } return this; }
    addTo(parent) { 
        if (!parent) return this;
        const target = (typeof parent.getObject3D === 'function') ? parent.getObject3D() : parent;
        if (target && typeof target.add === 'function') target.add(this.mesh);
        return this;
    }
    getObject3D() { return this.mesh; }
}

export default Skybox;
