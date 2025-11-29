import * as THREE from 'three';

export class Skybox {
    /**
     * options:
     *  - size: outer size of box (default 500)
     *  - color: fallback color (hex or css) when no images provided
     *  - images: optional array of 6 image URLs in order: [px, nx, py, ny, pz, nz]
     *  - useCubeTextureBackground: if true and images provided, you can call applyAsBackground(scene) to set scene.background
     */
    constructor({ size = 500, color = 0x87CEEB, images = null, useCubeTextureBackground = false } = {}) {
        this.group = new THREE.Object3D();
        this.size = size;
        this.color = color;
        this.images = images;
        this.useCubeTextureBackground = useCubeTextureBackground;

        this._createMesh();
    }

    _createMesh() {
        // remove previous if exists
        if (this.mesh) {
            this.group.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (Array.isArray(this.mesh.material)) this.mesh.material.forEach(m => m.dispose());
            else if (this.mesh.material) this.mesh.material.dispose();
            this.mesh = null;
        }

        const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);

        // If images are provided, create materials with textures for each face
        if (this.images && Array.isArray(this.images) && this.images.length === 6) {
            const loader = new THREE.TextureLoader();
            // order: px, nx, py, ny, pz, nz
            const materials = this.images.map((url) => {
                const tex = loader.load(url);
                const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide });
                return mat;
            });

            this.mesh = new THREE.Mesh(geometry, materials);
        } else {
            // single-color skybox
            const mat = new THREE.MeshBasicMaterial({ color: this.color, side: THREE.BackSide });
            // apply same material to all faces
            this.mesh = new THREE.Mesh(geometry, mat);
        }

        this.mesh.frustumCulled = false; // ensure it's always rendered
        this.group.add(this.mesh);
    }

    /**
     * Apply the images as a CubeTexture and set scene.background (optional)
     * images order for CubeTextureLoader: posx, negx, posy, negy, posz, negz
     */
    applyAsBackground(scene) {
        if (!this.images || this.images.length !== 6) return this;
        const loader = new THREE.CubeTextureLoader();
        const cubeTex = loader.load(this.images);
        cubeTex.encoding = THREE.sRGBEncoding;
        scene.background = cubeTex;
        this._backgroundTexture = cubeTex;
        return this;
    }

    setImages(imagesArray) {
        this.images = imagesArray;
        this._createMesh();
        return this;
    }

    setColor(color) {
        this.color = color;
        if (!this.images) {
            if (this.mesh && this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(m => m.color && m.color.set(color));
                } else {
                    this.mesh.material.color && this.mesh.material.color.set(color);
                }
            }
        }
        return this;
    }

    setSize(size) {
        this.size = size;
        this._createMesh();
        return this;
    }

    setPosition(x = 0, y = 0, z = 0) {
        this.group.position.set(x, y, z);
        return this;
    }

    setRotation(x = 0, y = 0, z = 0) {
        this.group.rotation.set(x, y, z);
        return this;
    }

    setVisibility(v) {
        if (this.group) this.group.visible = !!v;
        return this;
    }

    addTo(parent) {
        if (parent && typeof parent.add === 'function') parent.add(this.group);
        return this;
    }

    getObject3D() {
        return this.group;
    }
}