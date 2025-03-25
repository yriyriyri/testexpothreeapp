// App.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Asset } from 'expo-asset';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export default function App() {
  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;

    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor(0x0000ff, 1); 

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
    camera.position.z = 10;

    let model: THREE.Group | null = null;

    try {
      const asset = Asset.fromModule(require('./base_scene.glb'));
      await asset.downloadAsync();

      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(asset.localUri!);
      
      model = gltf.scene;
      scene.add(model);
    } catch (error) {
      console.error('Error loading GLB model:', error);
    }

    const animate = () => {
      requestAnimationFrame(animate);

      if (model) {
        model.rotation.y += 0.01;
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();
  };

  return (
    <View style={styles.container}>
      <GLView style={styles.container} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});