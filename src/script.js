import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import GUI from 'lil-gui'

const gui = new GUI()
/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let isMouseInside = false;  // Flag to track if the mouse is inside the canvas

// Add event listeners to track mouse entering and leaving the canvas
canvas.addEventListener('mouseenter', () => {
  isMouseInside = true;
});

canvas.addEventListener('mouseleave', () => {
  isMouseInside = false;
});

const ambientLight = new THREE.AmbientLight(0xffffff, 2); // White light with intensity 0.8
scene.add(ambientLight);

let objLoaded = false;
const mtlLoader = new MTLLoader().setPath('materials/');
mtlLoader.load('Cat Oi.mtl', (materials) => {
    materials.preload(); // Preload materials
  
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials); // Set the materials for the OBJ loader
  
    objLoader.load(
      'objects/Cat Oi.obj',
      (object) => {
        object.traverse((child) => {
            // Check if the child is a mesh before modifying its material
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((material) => {
                        material.transparent = true;
                    });
                }
            }
          });
        object.scale.set(0.2, 0.2, 0.2);
        scene.add(object); // Add the loaded object to the scene
        window.cat3d = object
        objLoaded = true;
        document.querySelector('#init h1').textContent = 'Click anywhere to start'
      },
      (xhr) => {
        console.log(`OBJ loading progress: ${(xhr.loaded / xhr.total) * 100}%`);
      },
      (error) => {
        console.error('An error occurred while loading the OBJ file:', error);
      }
    );
  }, (log) => {
    console.log('Loading', log);
  }, (error) => {
    console.error('An error occurred while loading the MTL file:', error);
    alert('Failed to load the material file. Please check the file path or format.');
  });

const textureLoader = new THREE.TextureLoader()
const facingCatTexture = textureLoader.load('textures/facing_cat.jpg')
const facingCatAlphaTexture = textureLoader.load('textures/facing_cat_alpha.jpg')
facingCatTexture.colorSpace = THREE.SRGBColorSpace

const geometry = new THREE.PlaneGeometry(1, 1, 255, 255)

const material = new THREE.MeshBasicMaterial({
    map: facingCatTexture,
    transparent: true,
    alphaMap: facingCatAlphaTexture,
    side: THREE.DoubleSide,
});
const facingCatMesh = new THREE.Mesh(geometry, material)
scene.add(facingCatMesh)

window.addEventListener('pointermove', onPointerMove);

function onPointerMove(event) {
    if (isMouseInside) {
        // Update mouse coordinates relative to canvas size
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
}
  

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    facingCatMesh.lookAt(camera.position)

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Camera
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.z = 3
scene.add(camera)

// Controls
// const controls = new OrbitControls(camera, canvas)
// controls.enableDamping = true

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Animate
const clock = new THREE.Clock()

const params = {
    spinSpeed: 6 * Math.PI * 2,
    bounceSpeed: 6 * Math.PI,
    speedMod: 1,
}

gui.add(params, 'speedMod').min(0.5).max(1.5).step(0.1).onChange((speed) => window.audio.playbackRate = speed);

let firstClick = false;

window.addEventListener('click', () => {
    if (!firstClick && objLoaded) {
        firstClick = true;
        document.querySelector('#init').classList.add('hide')
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioElement = new Audio('audio/oiia.mp3');
        const audioSource = audioContext.createMediaElementSource(audioElement);
        audioElement.loop = true;

        audioSource.connect(audioContext.destination);
        window.audio = audioElement
    }
})

const tick = () =>
{
    // update the picking ray with the camera and pointer position
    raycaster.setFromCamera(pointer, camera);

    // calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children);
    const elapsedTime = clock.getElapsedTime()


    const isIntersected = intersects.some(intersect => firstClick && isMouseInside && intersect.object === facingCatMesh);
    if (isIntersected) {
        facingCatMesh.material.opacity = 0;
        facingCatMesh.material.depthWrite = false;
        facingCatMesh.material.depthTest = false;
        if (window.cat3d) {
            window.cat3d.rotation.y = elapsedTime * params.spinSpeed * params.speedMod
            window.cat3d.position.y = Math.sin(elapsedTime * params.bounceSpeed * params.speedMod ) * 0.1
            window.cat3d?.traverse((child) => {
                if (child.isMesh) {
                    child.material.forEach((material) => {
                        material.opacity = 1;
                        material.depthWrite = true;
                        material.depthTest = true;
                    });
                }
            });
        }
        if (window.audio?.paused) !window.audio?.play();
    } else {
        facingCatMesh.material.opacity = 1;
        facingCatMesh.material.depthWrite = true;
        facingCatMesh.material.depthTest = true;
        if (window.cat3d) {
            window.cat3d.rotation.y = 0;
            window.cat3d.position.y = 0;
            window.cat3d?.traverse((child) => {
                if (child.isMesh) {
                    child.material.forEach((material) => {
                        material.opacity = 0;
                        material.depthWrite = false;
                        material.depthTest = false;
                    });
                }
            });
        }
        if (!window.audio?.paused) window.audio?.pause();
    }

    // Update controls
    // controls.update()
    // camera.lookAt(mesh.position)

    // Render
    if (firstClick)
        renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()