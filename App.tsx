// App.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Asset } from 'expo-asset';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import OrbitControlsView  from './OrbitControlsView';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export default function App() {

  const [camera, setCamera] = React.useState<THREE.Camera | null>(null);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;

    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor(0x0000ff, 1); 
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
    camera.position.z = 10;

    setCamera(camera);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.bias = -0.005;
    scene.add(directionalLight);

    let model: THREE.Group | null = null;

    try {
      const asset = Asset.fromModule(require('./base_scene.glb'));
      await asset.downloadAsync();

      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(asset.localUri!);
      
      model = gltf.scene;
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(model);
    } catch (error) {
      console.error('Error loading GLB model:', error);
    }

    const animate = () => {
      requestAnimationFrame(animate);

      if (model) {
        model.rotation.y += 0.01;
      }

      renderer.render(scene, camera as THREE.PerspectiveCamera);
      gl.endFrameEXP();
    };

    animate();
  };

  return (
      <OrbitControlsView style={{ flex: 1 }} camera={camera}>
        <GLView style={styles.container} onContextCreate={onContextCreate}/>
      </OrbitControlsView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});