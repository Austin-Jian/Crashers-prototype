// Get references to DOM elements
const counterDOM = document.getElementById('counter');
const endDOM = document.getElementById('end');
const retryButton = document.getElementById('retry');
const returnToMenuButton = document.getElementById('return-to-menu');
const gameOverText = document.getElementById('game-over');

// Create a new Three.js scene
const scene = new THREE.Scene();

// Set up the camera with orthographic view
const distance = 500;
const camera = new THREE.OrthographicCamera(
  window.innerWidth / -2, window.innerWidth / 2,
  window.innerHeight / 2, window.innerHeight / -2,
  0.1, 10000
);

// Set camera rotations for reversing the screen with a slight clockwise rotation
camera.rotation.x = -50 * Math.PI / 180;
camera.rotation.y = -20 * Math.PI / 180;
camera.rotation.z = Math.PI + (10 * Math.PI / 180); // Rotate 10 degrees clockwise

// Calculate initial camera positions based on rotations
const initialCameraPositionY = -Math.tan(camera.rotation.x) * distance;
const initialCameraPositionX = Math.tan(camera.rotation.y) * Math.sqrt(distance ** 2 + initialCameraPositionY ** 2);
camera.position.y = initialCameraPositionY;
camera.position.x = initialCameraPositionX;
camera.position.z = distance;

const zoom = 2; // Set zoom level
const chickenSize = 15; // Set size of the chicken sprite
const positionWidth = 42; // Width of each position on the board
const columns = 17; // Number of columns on the board
const boardWidth = positionWidth * columns; // Total width of the board

const stepTime = 200; // Time in milliseconds for each step

// Declare game variables
let lanes;
let currentLane;
let currentColumn;
let previousTimestamp;
let startMoving;
let moves;
let stepStartTimestamp;
let gameOver = false; // Flag to check if the game is over
let collisionSoundPlayed = false; // Flag to check if the collision sound has been played

// Base64 textures
// Base64 placeholders
const customTextureBase64 = "";
const carTextureBase64 = "";
const truckTextureBase64 = "";
const reverseCarTextureBase64 = "";
const reverseTruckTextureBase64 = "";
const treeTexture1Base64 = ""; 
const treeTexture2Base64 = ""; // Replace with your actual Base64 string

// Load the selected character from local storage
let selectedCharacterBase64 = customTextureBase64; // Default character
const storedCharacterBase64 = localStorage.getItem('selectedCharacterBase64');
if (storedCharacterBase64) {
  selectedCharacterBase64 = storedCharacterBase64;
}

// Load custom image texture
const textureLoader = new THREE.TextureLoader();
const customTexture = textureLoader.load(`${selectedCharacterBase64}`);
const carTexture = textureLoader.load(`${carTextureBase64}`);
const reverseCarTexture = textureLoader.load(`${reverseCarTextureBase64}`);
const truckTexture = textureLoader.load(`${truckTextureBase64}`);
const reverseTruckTexture = textureLoader.load(`${reverseTruckTextureBase64}`);
const treeTexture1 = textureLoader.load(`${treeTexture1Base64}`);
const treeTexture2 = textureLoader.load(`${treeTexture2Base64}`);

const sphereGeometry = new THREE.SphereGeometry(40, 60, 60);
const sphereMaterial = new THREE.MeshBasicMaterial({
  color: 0x3C3C3C,
  transparent: true,  // Allow transparency
  opacity: 0.5,       // Set the opacity to make it semi-transparent if needed
  depthTest: true,
  depthWrite: false   // Disable depth writing so other objects can render over it
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.z = 40; // Ensure sphere is behind other elements by z position

sphere.renderOrder = -10; // Render the sphere first

// Generate lanes for the board
const generateLanes = () => [-13, -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
  .map((index) => {
    const lane = new Lane(index);
    lane.mesh.position.y = index * positionWidth * zoom;
    scene.add(lane.mesh);
    return lane;
  })
  .filter((lane) => lane.index >= 0);

// Add a new lane to the board
const addLane = () => {
  const index = lanes.length;
  const lane = new Lane(index);
  lane.mesh.position.y = index * positionWidth * zoom;
  scene.add(lane.mesh);
  lanes.push(lane);
}

// Load custom image texture

function createTruckSprite(texture, width, height) {
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width * zoom, height * zoom, 1);
  sprite.castShadow = true;
  sprite.receiveShadow = false;
  sprite.position.z = (height / 2 * zoom) - 15; // Adjust z position to ensure it overlaps the custom image
  return sprite;
}

function createVehicleSprite(texture, width, height) {
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width * zoom, height * zoom, 1);
  sprite.castShadow = true;
  sprite.receiveShadow = false;
  sprite.position.z = (height / 2 * zoom) - 10; // Adjust z position to ensure it overlaps the custom image
  return sprite;
}

// Function to create a shadow texture
function createShadowTexture(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  context.fillStyle = "rgba(0, 0, 0, 0.5)"; // Semi-transparent black
  context.beginPath();
  context.ellipse(width / 2, height / 2, width / 2, height / 4, 0, 0, 2 * Math.PI);
  context.fill();

  return new THREE.CanvasTexture(canvas);
}

// Create shadow textures for cars, trucks, and custom image
const carShadowTexture = createShadowTexture(50 * zoom, 25 * zoom);
const truckShadowTexture = createShadowTexture(60 * zoom, 30 * zoom);
const customImageShadowTexture = createShadowTexture(chickenSize * zoom * 3, chickenSize * zoom / 2);

// Custom shadow textures for tree, cow, and elephant emojis
const treeShadowTexture = createShadowTexture(30 * zoom, 15 * zoom);
const cowShadowTexture = createShadowTexture(70 * zoom, 35 * zoom);
const elephantShadowTexture = createShadowTexture(80 * zoom, 40 * zoom);

// Function to create a sprite with shadow
function createSpriteWithShadow(texture, width, height, shadowTexture, shadowZOffset = -height / 2 * zoom - 1, zPosition = 40) {
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width * zoom, height * zoom, 1);
  sprite.castShadow = true;
  sprite.receiveShadow = false;
  sprite.position.z = zPosition; // Use the provided z position or default to 40

  const shadowMaterial = new THREE.SpriteMaterial({ map: shadowTexture, transparent: true });
  const shadowSprite = new THREE.Sprite(shadowMaterial);
  shadowSprite.scale.set(width * zoom, height / 2 * zoom, 1);
  shadowSprite.position.set(0, 0, shadowZOffset);

  const group = new THREE.Group();
  group.add(shadowSprite);
  group.add(sprite);

  group.children.forEach(child => {
    if (child.material) {
      child.material.depthTest = true;
    }
  });

  return group;
}

// Create the sprite for the custom image with shadow
const customImageGroup = createSpriteWithShadow(customTexture, chickenSize * 3, chickenSize * 3, customImageShadowTexture);
customImageGroup.position.z = 20 * zoom - 40; // Adjust z position to bring the sprite above the ground
customImageGroup.children[0].position
customImageGroup.renderOrder = 2; // Set render order to ensure it renders after the car
scene.add(customImageGroup);

// Add hemisphere light to the scene
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
scene.add(hemiLight);

// Set initial directional light positions
const initialDirLightPositionX = -100;
const initialDirLightPositionY = -100;
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
dirLight.castShadow = true;
dirLight.target = customImageGroup; // Target the new custom image group
scene.add(dirLight);

// Configure directional light shadow properties
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
var d = 500;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;

// Add a back light to the scene
const backLight = new THREE.DirectionalLight(0x000000, .4);
backLight.position.set(200, 200, 50);
backLight.castShadow = true;
scene.add(backLight);

// Define lane types, speeds, and vehicle colors
const laneTypes = ['car', 'truck', 'forest'];
const laneSpeeds = [2, 2.5, 3];
const vechicleColors = [0x428eff, 0xffef42, 0xff7b42, 0xff426b];
const threeHeights = [20, 45, 60];

// Function to create a tree sprite with shadow
function createTreeSprite(texture, size, shadowTexture) {
  const shadowZOffset = -size / 2 * zoom - 1; // Define shadowZOffset here
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size * zoom, size * zoom, 1);
  sprite.castShadow = true;
  sprite.receiveShadow = false;
  sprite.position.z = 40; // Adjust z position to ensure it overlaps the ground

  const shadowMaterial = new THREE.SpriteMaterial({ map: shadowTexture, transparent: true });
  const shadowSprite = new THREE.Sprite(shadowMaterial);
  shadowSprite.scale.set(size * zoom, size / 2 * zoom, 1);
  shadowSprite.position.set(0, 0, shadowZOffset);

  const group = new THREE.Group();
  group.add(shadowSprite);
  group.add(sprite);

  group.children.forEach(child => {
    if (child.material) {
      child.material.depthTest = true;
    }
  });

  return group;
}


function Three() {
  const three = new THREE.Group();

  // Randomly select a texture for each tree
  const texture = Math.random() < 0.5 ? treeTexture1 : treeTexture2;
  const treeSize = 50; // Size of the tree sprite
  const treeSprite = createTreeSprite(texture, treeSize, treeShadowTexture);
  three.add(treeSprite);

  three.renderOrder = 2; // Ensure tree renders after the custom image

  return three;
}

// Initialize game values
const initaliseValues = () => {
  lanes = generateLanes();
  currentLane = 0;
  currentColumn = Math.floor(columns / 2);
  previousTimestamp = null;
  gameOver = false;
  collisionSoundPlayed = false;
  startMoving = false;
  moves = [];
  stepStartTimestamp = null;
  customImageGroup.position.x = 0;
  customImageGroup.position.y = 0;
  sphere.position.x = customImageGroup.position.x - 5; // Initial sphere position relative to custom image
  sphere.position.y = customImageGroup.position.y + 50; // Initial sphere position relative to custom image
  camera.position.y = initialCameraPositionY;
  camera.position.x = initialCameraPositionX;
  dirLight.position.x = initialDirLightPositionX;
  dirLight.position.y = initialDirLightPositionY;
}

// Initialize game values on load
initaliseValues();

// Create the WebGL renderer
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Texture function to create canvas textures
function Texture(width, height, rects) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "rgba(0,0,0,0.6)";
  rects.forEach(rect => {
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
  });
  return new THREE.CanvasTexture(canvas);
}

// Create a car with textures and shadow
function Car(direction) {
  const carWidth = 60; // Width of the car sprite
  const carHeight = 60; // Height of the car sprite
  const texture = direction ? reverseCarTexture : carTexture;
  const carGroup = createSpriteWithShadow(texture, carWidth, carHeight, carShadowTexture);
  return carGroup;
}

// Create a truck with textures and shadow
function Truck(direction) {
  const truckWidth = 60; // Adjusted width of the truck sprite
  const truckHeight = 60; // Adjusted height of the truck sprite
  const texture = direction ? reverseTruckTexture : truckTexture;
  const truckGroup = createSpriteWithShadow(texture, truckWidth, truckHeight, truckShadowTexture, undefined, 40); // Set the z position to 100
  return truckGroup;
}

// Create a road lane
function Road() {
  const road = new THREE.Group();

  const createSection = color => new THREE.Mesh(
    new THREE.PlaneBufferGeometry(boardWidth * zoom, positionWidth * zoom),
    new THREE.MeshPhongMaterial({ color })
  );

  const middle = createSection(0x454A59);
  middle.receiveShadow = true;
  road.add(middle);

  const left = createSection(0x393D49);
  left.position.x = -boardWidth * zoom;
  road.add(left);

  const right = createSection(0x393D49);
  right.position.x = boardWidth * zoom;
  road.add(right);

  return road;
}

// Create a grass lane
function Grass() {
  const grass = new THREE.Group();
  const createSection = color => new THREE.Mesh(
    new THREE.BoxBufferGeometry(boardWidth * zoom, positionWidth * zoom, 3 * zoom),
    new THREE.MeshPhongMaterial({ color })
  );

  const middle = createSection(0x61e95e);
  middle.receiveShadow = true;
  grass.add(middle);

  const left = createSection(0x63a261);
  left.position.x = -boardWidth * zoom;
  grass.add(left);
  
  const right = createSection(0x63a261);
  right.position.x = boardWidth * zoom;
  grass.add(right);

  grass.position.z = 1.5 * zoom;
  return grass;
}

// Create a lane based on the type (field, forest, car, truck)
function Lane(index) {
  this.index = index;
  this.type = index <= 0 ? 'field' : laneTypes[Math.floor(Math.random() * laneTypes.length)];

  switch (this.type) {
    case 'field': {
      this.type = 'field';
      this.mesh = new Grass();
      break;
    }
    case 'forest': {
      this.mesh = new Grass();
      this.occupiedPositions = new Set();
      this.threes = [1, 2, 3, 4].map(() => {
        const three = new Three();
        let position;
        do {
          position = Math.floor(Math.random() * columns);
        } while (this.occupiedPositions.has(position))
          this.occupiedPositions.add(position);
        three.position.x = (position * positionWidth + positionWidth / 2) * zoom - boardWidth * zoom / 2;
        this.mesh.add(three);
        return three;
      });
      break;
    }
    case 'car': {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.vehicles = [1, 2, 3].map(() => {
        const vehicle = new Car(this.direction);
        let position;
        do {
          position = Math.floor(Math.random() * columns / 2);
        } while (occupiedPositions.has(position))
          occupiedPositions.add(position);
        vehicle.position.x = (position * positionWidth * 2 + positionWidth / 2) * zoom - boardWidth * zoom / 2;
        this.mesh.add(vehicle);
        return vehicle;
      });

      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
    }
    case 'truck': {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.vehicles = [1, 2].map(() => {
        const vehicle = new Truck(this.direction);
        let position;
        do {
          position = Math.floor(Math.random() * columns / 3);
        } while (occupiedPositions.has(position))
          occupiedPositions.add(position);
        vehicle.position.x = (position * positionWidth * 3 + positionWidth / 2) * zoom - boardWidth * zoom / 2;
        this.mesh.add(vehicle);
        return vehicle;
      });

      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
    }
  }
}

// Event listener for retry button
retryButton.addEventListener("click", () => {
  lanes.forEach(lane => scene.remove(lane.mesh));
  initaliseValues();
  endDOM.style.visibility = 'hidden';
  retryButton.style.visibility = 'hidden';
  returnToMenuButton.style.visibility = 'hidden';
  gameOverText.style.visibility = 'hidden'; // Hide game over text when retrying
  playBackgroundMusic();
});

// Event listeners for move buttons
document.getElementById('forward').addEventListener("click", () => {
  move('backward');
  playMoveSound();
});

document.getElementById('backward').addEventListener("click", () => {
  move('forward');
  playMoveSound();
});

document.getElementById('left').addEventListener("click", () => {
  move('right');
  playMoveSound();
});

document.getElementById('right').addEventListener("click", () => {
  move('left');
  playMoveSound();
});

// Event listener for keyboard input
window.addEventListener("keydown", event => {
  if ((event.keyCode == '38') && (!gameOver)) {
    // up arrow (inverted to move backward)
    move('backward');
    playMoveSound();
  }
  else if ((event.keyCode == '40') && (!gameOver)) {
    // down arrow (inverted to move forward)
    move('forward');
    playMoveSound();
  }
  else if ((event.keyCode == '37') && (!gameOver)) {
    // left arrow (inverted to move right)
    move('right');
    playMoveSound();
  }
  else if ((event.keyCode == '39') && (!gameOver)) {
    // right arrow (inverted to move left)
    move('left');
    playMoveSound();
  }
});

// Move function to handle player movement
function move(direction) {
  const finalPositions = moves.reduce((position, move) => {
    if (move === 'forward') return { lane: position.lane + 1, column: position.column };
    if (move === 'backward') return { lane: position.lane - 1, column: position.column };
    if (move === 'left') return { lane: position.lane, column: position.column - 1 };
    if (move === 'right') return { lane: position.lane, column: position.column + 1 };
  }, { lane: currentLane, column: currentColumn });

  if (direction === 'forward') {
    if (lanes[finalPositions.lane + 1].type === 'forest' && lanes[finalPositions.lane + 1].occupiedPositions.has(finalPositions.column)) return;
    if (!stepStartTimestamp) startMoving = true;
    addLane();
  }
  else if (direction === 'backward') {
    if (finalPositions.lane === 0) return;
    if (lanes[finalPositions.lane - 1].type === 'forest' && lanes[finalPositions.lane - 1].occupiedPositions.has(finalPositions.column)) return;
    if (!stepStartTimestamp) startMoving = true;
  }
  else if (direction === 'left') {
    if (finalPositions.column === 0) return;
    if (lanes[finalPositions.lane].type === 'forest' && lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column - 1)) return;
    if (!stepStartTimestamp) startMoving = true;
  }
  else if (direction === 'right') {
    if (finalPositions.column === columns - 1) return;
    if (lanes[finalPositions.lane].type === 'forest' && lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column + 1)) return;
    if (!stepStartTimestamp) startMoving = true;
  }
  moves.push(direction);
}

// Animation loop function
function animate(timestamp) {
  requestAnimationFrame(animate);

  if (!previousTimestamp) previousTimestamp = timestamp;
  const delta = timestamp - previousTimestamp;
  previousTimestamp = timestamp;

  // Animate cars and trucks moving on the lane
  lanes.forEach(lane => {
    if (lane.type === 'car' || lane.type === 'truck') {
      const aBitBeforeTheBeginingOfLane = -boardWidth * zoom / 2 - positionWidth * 2 * zoom;
      const aBitAfterTheEndOFLane = boardWidth * zoom / 2 + positionWidth * 2 * zoom;
      lane.vehicles.forEach(vehicle => {
        if (lane.direction) {
          vehicle.position.x = vehicle.position.x < aBitBeforeTheBeginingOfLane ? aBitAfterTheEndOFLane : vehicle.position.x -= lane.speed / 16 * delta;
        } else {
          vehicle.position.x = vehicle.position.x > aBitAfterTheEndOFLane ? aBitBeforeTheBeginingOfLane : vehicle.position.x += lane.speed / 16 * delta;
        }
      });
    }
  });

  // Handle player movement
  if (startMoving) {
    stepStartTimestamp = timestamp;
    startMoving = false;
  }

  if (stepStartTimestamp) {
    const moveDeltaTime = timestamp - stepStartTimestamp;
    const moveDeltaDistance = Math.min(moveDeltaTime / stepTime, 1) * positionWidth * zoom;

    switch (moves[0]) {
      case 'forward': {
        const positionY = currentLane * positionWidth * zoom + moveDeltaDistance;
        camera.position.y = initialCameraPositionY + positionY;
        dirLight.position.y = initialDirLightPositionY + positionY;
        customImageGroup.position.y = positionY; // initial custom image position is 0
        sphere.position.y = positionY + 50; // Update sphere position to match custom image
        break;
      }
      case 'backward': {
        const positionY = currentLane * positionWidth * zoom - moveDeltaDistance;
        camera.position.y = initialCameraPositionY + positionY;
        dirLight.position.y = initialDirLightPositionY + positionY;
        customImageGroup.position.y = positionY;
        sphere.position.y = positionY + 50 ; // Update sphere position to match custom image
        break;
      }
      case 'left': {
        const positionX = (currentColumn * positionWidth + positionWidth / 2) * zoom - boardWidth * zoom / 2 - moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;
        dirLight.position.x = initialDirLightPositionX + positionX;
        customImageGroup.position.x = positionX; // initial custom image position is 0
        sphere.position.x = positionX - 5; // Update sphere position relative to custom image
        break;
      }
      case 'right': {
        const positionX = (currentColumn * positionWidth + positionWidth / 2) * zoom - boardWidth * zoom / 2 + moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;
        dirLight.position.x = initialDirLightPositionX + positionX;
        customImageGroup.position.x = positionX;
        sphere.position.x = positionX - 5; // Update sphere position relative to custom image
        break;
      }
    }
    // Once a step has ended
    if (moveDeltaTime > stepTime) {
      switch (moves[0]) {
        case 'forward': {
          currentLane++;
          counterDOM.innerHTML = currentLane;
          break;
        }
        case 'backward': {
          currentLane--;
          counterDOM.innerHTML = currentLane;
          break;
        }
        case 'left': {
          currentColumn--;
          break;
        }
        case 'right': {
          currentColumn++;
          break;
        }
      }
      moves.shift();
      // If more steps are to be taken then restart counter otherwise stop stepping
      stepStartTimestamp = moves.length === 0 ? null : timestamp;
    }
  }

  // Ensure the custom image is always rendered
  customImageGroup.children[1].material.depthTest = true;
  customImageGroup.children[1].material.depthWrite = true;

  // Hit test
  if (lanes[currentLane].type === 'car' || lanes[currentLane].type === 'truck') {
    const customImageMinX = customImageGroup.position.x - chickenSize * zoom / 2;
    const customImageMaxX = customImageGroup.position.x + chickenSize * zoom / 2;
    const vehicleLength = { car: 50, truck: 60 }[lanes[currentLane].type]; // Use correct sprite dimensions
    lanes[currentLane].vehicles.forEach(vehicle => {
      const vehicleMinX = vehicle.position.x - vehicleLength * zoom / 2;
      const vehicleMaxX = vehicle.position.x + vehicleLength * zoom / 2;
      if (customImageMaxX > vehicleMinX && customImageMinX < vehicleMaxX) {
        // Ensure the car is always on top during collision
        if (lanes[currentLane].type === 'car') {
          customImageGroup.position.z = vehicle.position.z - 0.1; // Adjust z-index to make sure car is on top
        }
        if (!collisionSoundPlayed) {
          gameOver = true;
          endDOM.style.visibility = 'visible';
          stopAllAudio();
          collisionSoundPlayed = true;
          playCollisionSound();

          // Show game over text
          gameOverText.style.visibility = 'visible';

          setTimeout(() => {
            gameOverText.style.visibility = 'hidden';
            retryButton.style.visibility = 'visible';
            returnToMenuButton.style.visibility = 'visible';
          }, 1900); // Hide game over text and show buttons after 1.9 seconds
        }
      }
    });
  }

  renderer.render(scene, camera);
}

// Start the animation loop
requestAnimationFrame(animate);

// Audio elements
const backgroundMusic = document.getElementById('background-music');
const moveSound = document.getElementById('move-sound');
const collisionSound = document.getElementById('collision-sound');

// Set the volume for the move sound to be quieter
moveSound.volume = 0.05; // Adjust the volume level to a quieter setting (0.0 to 1.0)

// Function to play background music
function playBackgroundMusic() {
  const musicEnabled = localStorage.getItem('musicEnabled') === 'true';
  if (musicEnabled) {
    backgroundMusic.play().catch(error => {
      console.log('Error playing background music:', error);
    });
  }
}

// Immediately play background music when the page loads if music is enabled
playBackgroundMusic();

// Function to stop all audio
function stopAllAudio() {
  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
  moveSound.pause();
  moveSound.currentTime = 0;
  collisionSound.pause();
  collisionSound.currentTime = 0;
}

// Function to start background music after user interaction
function userInteractionHandler() {
  playBackgroundMusic();
  window.removeEventListener('click', userInteractionHandler);
  window.removeEventListener('keydown', userInteractionHandler);
}

// Add event listeners for user interaction to start background music
window.addEventListener('click', userInteractionHandler, { once: true });
window.addEventListener('keydown', userInteractionHandler, { once: true });

function playMoveSound() {
  const soundEffectsEnabled = localStorage.getItem('soundEffectsEnabled') === 'true';
  if (soundEffectsEnabled) {
    moveSound.currentTime = 0;
    moveSound.play().catch(error => {
      console.log('Error playing move sound:', error);
    });
  }
}

function playCollisionSound() {
  const soundEffectsEnabled = localStorage.getItem('soundEffectsEnabled') === 'true';
  if (soundEffectsEnabled) {
    collisionSound.currentTime = 0;
    collisionSound.play().catch(error => {
      console.log('Error playing collision sound:', error);
    });
  }
}
