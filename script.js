// Get references to DOM elements
const counterDOM = document.getElementById('counter');
const endDOM = document.getElementById('end');
const retryButton = document.getElementById('retry');

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

// Textures for cars and trucks
const carFrontTexture = new Texture(40, 80, [{ x: 0, y: 10, w: 30, h: 60 }]);
const carBackTexture = new Texture(40, 80, [{ x: 10, y: 10, w: 30, h: 60 }]);
const carRightSideTexture = new Texture(110, 40, [{ x: 10, y: 0, w: 50, h: 30 }, { x: 70, y: 0, w: 30, h: 30 }]);
const carLeftSideTexture = new Texture(110, 40, [{ x: 10, y: 10, w: 50, h: 30 }, { x: 70, y: 10, w: 30, h: 30 }]);
const truckFrontTexture = new Texture(30, 30, [{ x: 15, y: 0, w: 10, h: 30 }]);
const truckRightSideTexture = new Texture(25, 30, [{ x: 0, y: 15, w: 10, h: 10 }]);
const truckLeftSideTexture = new Texture(25, 30, [{ x: 0, y: 5, w: 10, h: 10 }]);

// Generate lanes for the board
const generateLanes = () => [-13,-12,-11,-10,-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13]
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
const textureLoader = new THREE.TextureLoader();
const customTexture = textureLoader.load(''); // Replace with your image path

// Create a sprite material for the custom image
const customImageMaterial = new THREE.SpriteMaterial({
  map: customTexture,
  transparent: true
});

// Create the sprite for the custom image
const customImageSprite = new THREE.Sprite(customImageMaterial);
customImageSprite.scale.set(chickenSize * zoom * 3, chickenSize * zoom * 3, 1.0); // Adjust size
customImageSprite.position.z = 20 * zoom; // Adjust z position to bring the sprite above the ground

// Add the custom image sprite to the scene
scene.add(customImageSprite);

// Add hemisphere light to the scene
hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
scene.add(hemiLight);

// Set initial directional light positions
const initialDirLightPositionX = -100;
const initialDirLightPositionY = -100;
dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
dirLight.castShadow = true;
dirLight.target = customImageSprite; // Target the new custom image sprite
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
backLight = new THREE.DirectionalLight(0x000000, .4);
backLight.position.set(200, 200, 50);
backLight.castShadow = true;
scene.add(backLight);

// Define lane types, speeds, and vehicle colors
const laneTypes = ['car', 'truck', 'forest'];
const laneSpeeds = [2, 2.5, 3];
const vechicleColors = [0x428eff, 0xffef42, 0xff7b42, 0xff426b];
const threeHeights = [20, 45, 60];

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
  customImageSprite.position.x = 0;
  customImageSprite.position.y = 0;
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

// Create a wheel for vehicles
function Wheel() {
  const wheel = new THREE.Mesh(
    new THREE.BoxBufferGeometry(12 * zoom, 33 * zoom, 12 * zoom),
    new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true })
  );
  wheel.position.z = 6 * zoom;
  return wheel;
}

// Create a car with textures
function Car() {
  const car = new THREE.Group();
  const color = vechicleColors[Math.floor(Math.random() * vechicleColors.length)];

  const main = new THREE.Mesh(
    new THREE.BoxBufferGeometry(60 * zoom, 30 * zoom, 15 * zoom),
    new THREE.MeshPhongMaterial({ color, flatShading: true })
  );
  main.position.z = 12 * zoom;
  main.castShadow = true;
  main.receiveShadow = true;
  car.add(main);

  const cabin = new THREE.Mesh(
    new THREE.BoxBufferGeometry(33 * zoom, 24 * zoom, 12 * zoom),
    [
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carBackTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carFrontTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carRightSideTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carLeftSideTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }), // top
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }) // bottom
    ]
  );
  cabin.position.x = 6 * zoom;
  cabin.position.z = 25.5 * zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  car.add(cabin);

  const frontWheel = new Wheel();
  frontWheel.position.x = -18 * zoom;
  car.add(frontWheel);

  const backWheel = new Wheel();
  backWheel.position.x = 18 * zoom;
  car.add(backWheel);

  car.castShadow = true;
  car.receiveShadow = false;
  car.renderOrder = 2; // Ensure car renders after the custom image
  car.children.forEach(child => child.material.depthTest = true);

  return car;
}

// Create a truck with textures
function Truck() {
  const truck = new THREE.Group();
  const color = vechicleColors[Math.floor(Math.random() * vechicleColors.length)];

  const base = new THREE.Mesh(
    new THREE.BoxBufferGeometry(100 * zoom, 25 * zoom, 5 * zoom),
    new THREE.MeshLambertMaterial({ color: 0xb4c6fc, flatShading: true })
  );
  base.position.z = 10 * zoom;
  truck.add(base);

  const cargo = new THREE.Mesh(
    new THREE.BoxBufferGeometry(75 * zoom, 35 * zoom, 40 * zoom),
    new THREE.MeshPhongMaterial({ color: 0xb4c6fc, flatShading: true })
  );
  cargo.position.x = 15 * zoom;
  cargo.position.z = 30 * zoom;
  cargo.castShadow = true;
  cargo.receiveShadow = true;
  truck.add(cargo);

  const cabin = new THREE.Mesh(
    new THREE.BoxBufferGeometry(25 * zoom, 30 * zoom, 30 * zoom),
    [
      new THREE.MeshPhongMaterial({ color, flatShading: true }), // back
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckFrontTexture }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckRightSideTexture }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckLeftSideTexture }),
      new THREE.MeshPhongMaterial({ color, flatShading: true }), // top
      new THREE.MeshPhongMaterial({ color, flatShading: true }) // bottom
    ]
  );
  cabin.position.x = -40 * zoom;
  cabin.position.z = 20 * zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  truck.add(cabin);

  const frontWheel = new Wheel();
  frontWheel.position.x = -38 * zoom;
  truck.add(frontWheel);

  const middleWheel = new Wheel();
  middleWheel.position.x = -10 * zoom;
  truck.add(middleWheel);

  const backWheel = new Wheel();
  backWheel.position.x = 30 * zoom;
  truck.add(backWheel);

  truck.renderOrder = 2; // Ensure truck renders after the custom image
  truck.children.forEach(child => child.material.depthTest = true);

  return truck;
}

// Create a tree
function Three() {
  const three = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.BoxBufferGeometry(15 * zoom, 15 * zoom, 20 * zoom),
    new THREE.MeshPhongMaterial({ color: 0x4d2926, flatShading: true })
  );
  trunk.position.z = 10 * zoom;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  three.add(trunk);

  const height = threeHeights[Math.floor(Math.random() * threeHeights.length)];

  const crown = new THREE.Mesh(
    new THREE.BoxBufferGeometry(30 * zoom, 30 * zoom, height * zoom),
    new THREE.MeshLambertMaterial({ color: 0x7aa21d, flatShading: true })
  );
  crown.position.z = (height / 2 + 20) * zoom;
  crown.castShadow = true;
  crown.receiveShadow = false;
  three.add(crown);

  three.renderOrder = 2; // Ensure tree renders after the custom image
  three.children.forEach(child => child.material.depthTest = true);

  return three;
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

  const middle = createSection(0xBFA05B);
  middle.receiveShadow = true;
  grass.add(middle);

  const left = createSection(0xAF955B);
  left.position.x = -boardWidth * zoom;
  grass.add(left);

  const right = createSection(0xAF955B);
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
      this.vechicles = [1, 2, 3].map(() => {
        const vechicle = new Car();
        let position;
        do {
          position = Math.floor(Math.random() * columns / 2);
        } while (occupiedPositions.has(position))
          occupiedPositions.add(position);
        vechicle.position.x = (position * positionWidth * 2 + positionWidth / 2) * zoom - boardWidth * zoom / 2;
        if (!this.direction) vechicle.rotation.z = Math.PI;
        this.mesh.add(vechicle);
        return vechicle;
      });

      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
    }
    case 'truck': {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.vechicles = [1, 2].map(() => {
        const vechicle = new Truck();
        let position;
        do {
          position = Math.floor(Math.random() * columns / 3);
        } while (occupiedPositions.has(position))
          occupiedPositions.add(position);
        vechicle.position.x = (position * positionWidth * 3 + positionWidth / 2) * zoom - boardWidth * zoom / 2;
        if (!this.direction) vechicle.rotation.z = Math.PI;
        this.mesh.add(vechicle);
        return vechicle;
      });

      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
    }
  }
}

// Event listener for retry button
document.querySelector("#retry").addEventListener("click", () => {
  lanes.forEach(lane => scene.remove(lane.mesh));
  initaliseValues();
  endDOM.style.visibility = 'hidden';
  retryButton.style.visibility = 'hidden';
  playBackgroundMusic();
});

// Event listeners for move buttons
document.getElementById('forward').addEventListener("click", () => {
  move('forward');
  playMoveSound();
});

document.getElementById('backward').addEventListener("click", () => {
  move('backward');
  playMoveSound();
});

document.getElementById('left').addEventListener("click", () => {
  move('left');
  playMoveSound();
});

document.getElementById('right').addEventListener("click", () => {
  move('right');
  playMoveSound();
});

// Event listener for keyboard input
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
      lane.vechicles.forEach(vechicle => {
        if (lane.direction) {
          vechicle.position.x = vechicle.position.x < aBitBeforeTheBeginingOfLane ? aBitAfterTheEndOFLane : vechicle.position.x -= lane.speed / 16 * delta;
        } else {
          vechicle.position.x = vechicle.position.x > aBitAfterTheEndOFLane ? aBitBeforeTheBeginingOfLane : vechicle.position.x += lane.speed / 16 * delta;
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
    const jumpDeltaDistance = Math.sin(Math.min(moveDeltaTime / stepTime, 1) * Math.PI) * 8 * zoom;
    switch (moves[0]) {
      case 'forward': {
        const positionY = currentLane * positionWidth * zoom + moveDeltaDistance;
        camera.position.y = initialCameraPositionY + positionY;
        dirLight.position.y = initialDirLightPositionY + positionY;
        customImageSprite.position.y = positionY; // initial custom image position is 0
        customImageSprite.position.z = 20 * zoom + jumpDeltaDistance; // Adjust z position for jumping
        break;
      }
      case 'backward': {
        const positionY = currentLane * positionWidth * zoom - moveDeltaDistance;
        camera.position.y = initialCameraPositionY + positionY;
        dirLight.position.y = initialDirLightPositionY + positionY;
        customImageSprite.position.y = positionY;
        customImageSprite.position.z = 20 * zoom + jumpDeltaDistance; // Adjust z position for jumping
        break;
      }
      case 'left': {
        const positionX = (currentColumn * positionWidth + positionWidth / 2) * zoom - boardWidth * zoom / 2 - moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;
        dirLight.position.x = initialDirLightPositionX + positionX;
        customImageSprite.position.x = positionX; // initial custom image position is 0
        customImageSprite.position.z = 20 * zoom + jumpDeltaDistance; // Adjust z position for jumping
        break;
      }
      case 'right': {
        const positionX = (currentColumn * positionWidth + positionWidth / 2) * zoom - boardWidth * zoom / 2 + moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;
        dirLight.position.x = initialDirLightPositionX + positionX;
        customImageSprite.position.x = positionX;
        customImageSprite.position.z = 20 * zoom + jumpDeltaDistance; // Adjust z position for jumping
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
  customImageSprite.material.depthTest = true;
  customImageSprite.material.depthWrite = true;

  // Hit test
  if (lanes[currentLane].type === 'car' || lanes[currentLane].type === 'truck') {
    const customImageMinX = customImageSprite.position.x - chickenSize * zoom / 2;
    const customImageMaxX = customImageSprite.position.x + chickenSize * zoom / 2;
    const vechicleLength = { car: 60, truck: 105 }[lanes[currentLane].type];
    lanes[currentLane].vechicles.forEach(vechicle => {
      const carMinX = vechicle.position.x - vechicleLength * zoom / 2;
      const carMaxX = vechicle.position.x + vechicleLength * zoom / 2;
      if (customImageMaxX > carMinX && customImageMinX < carMaxX) {
        if (!collisionSoundPlayed) {
          gameOver = true;
          endDOM.style.visibility = 'visible';
          stopAllAudio();
          collisionSoundPlayed = true;
          playCollisionSound();
          setTimeout(() => {
            retryButton.style.visibility = 'visible';
          }, 2000);
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
  backgroundMusic.play().catch(error => {
    console.log('Error playing background music:', error);
  });
}

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

// Function to play move sound
function playMoveSound() {
  moveSound.currentTime = 0;
  moveSound.play().catch(error => {
    console.log('Error playing move sound:', error);
  });
}

// Function to play collision sound
function playCollisionSound() {
  collisionSound.currentTime = 0;
  collisionSound.play().catch(error => {
    console.log('Error playing collision sound:', error);
  });
}
