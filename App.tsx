// App.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Asset } from 'expo-asset';
import * as THREE from 'three';
import { TextureLoader } from 'expo-three'; 
import { Renderer } from 'expo-three';
import OrbitControlsView from './orbit-controls/OrbitControlsView';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

import { Boxy } from './boxy/boxy';

export default function App() {
  const [camera, setCamera] = React.useState<THREE.Camera | null>(null);
  let boxyInstance: Boxy | undefined;

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;

    const renderer = new Renderer({ gl, antialias: false });
    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;

    const scene = new THREE.Scene();

    const rgbeLoader = new RGBELoader();
    const hdrUrl = "/BoxyBuilderAssets/envs/hdr/kloofendal_48d_partly_cloudy_puresky_1k.hdr";
    rgbeLoader.load(hdrUrl, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
      scene.background = null;
    });
    scene.backgroundRotation = new THREE.Euler(0, -90, 0);

    const cameraObj = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
    cameraObj.position.z = 10;
    scene.add(cameraObj);
    setCamera(cameraObj);

    const ambientLight = new THREE.AmbientLight(0xffffff, 4);
    scene.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff, 6);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    cameraObj.add(light);
    light.position.copy(new THREE.Vector3(-180, 122, -19));

    try {
      boxyInstance = new Boxy({
        Body: "Body_2",
        Ears: "Ears_1",
        Paws: "Paws_2",
        paletteIndex: 2,
      });
      const boxyGroup = await boxyInstance.load();
      scene.add(boxyGroup);
    } catch (error) {
      console.error("Error loading Boxy:", error);
    }

    // try {
    //   const asset = Asset.fromModule(require('./boxy-assets/textures/boxy-sprite-sheet.png'));
    //   await asset.downloadAsync();
    
    //   const texture = await new TextureLoader().loadAsync(asset.localUri || asset.uri);
    //   texture.flipY = false;
    //   texture.minFilter = THREE.NearestFilter;
    //   texture.magFilter = THREE.NearestFilter;
    //   texture.needsUpdate = true;
    
    //   const planeGeometry = new THREE.PlaneGeometry(4, 2);
    //   const planeMaterial = new THREE.MeshBasicMaterial({ map: texture });
    //   const debugPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    
    //   debugPlane.position.set(0, 2.5, 0); 
    //   scene.add(debugPlane);
    
    // } catch (err) {
    // }

    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (boxyInstance) {
        boxyInstance.update(delta);
      }
      renderer.render(scene, cameraObj as THREE.PerspectiveCamera);
      gl.endFrameEXP();
    };

    animate();
  };

  return (
    <OrbitControlsView style={{ flex: 1 }} camera={camera}>
      <GLView style={styles.container} onContextCreate={onContextCreate} />
    </OrbitControlsView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});