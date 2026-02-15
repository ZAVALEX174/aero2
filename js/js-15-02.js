console.log("ИСПРАВЛЕННАЯ ВЕРСИЯ: Расчет воздуха по направлению потоков");

// ==================== КОНСТАНТЫ И ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
const APP_CONFIG = {
  GRID_SIZE: 20,
  SNAP_RADIUS: 15,
  MAX_UNDO_STEPS: 50,
  DEFAULT_LINE_COLOR: '#4A00E0',
  DEFAULT_LINE_WIDTH: 5,
  MAX_IMAGE_SIZE: 40,
  NODE_THRESHOLD: 5,
  NODE_LOCK_DEFAULT: true,
  MAX_OBJECTS: 1000,
  SPATIAL_GRID_SIZE: 100,
  MAX_CALCULATION_TIME: 5000
};

let canvas;
let isDrawingLine = false;
let isContinuousLineMode = false;
let lineStartPoint = null;
let previewLine = null;
let lastLineEndPoint = null;
let currentEditingLine = null;
let currentImageData = null;
let gridVisible = true;
let undoStack = [];
let redoStack = [];
let contextMenuVisible = false;
let autoSplitMode = true;
let lineSplitMode = 'AUTO';
let altKeyPressed = false;

let intersectionPoints = [];
let intersectionVisuals = [];
let currentEditingObject = null;
let currentEditingObjectType = null;
let isCalculatingAirVolumes = false;

let connectionNodes = new Map();
let nodeLockEnabled = APP_CONFIG.NODE_LOCK_DEFAULT;

let cachedLines = null;
let cachedImages = null;
let cachedAllObjects = null;
let cacheDirty = true;

let spatialGrid = new Map();
let spatialGridDirty = true;

let isUpdatingConnections = false;
let isProcessingEvents = false;
let isDrawingImage = false;

let renderTimeout = null;
let updateGraphTimeout = null;
let updateTextsTimeout = null;

const performanceMetrics = {
  lastRenderTime: 0,
  lastIntersectionTime: 0,
  lastGraphUpdateTime: 0,
  objectCount: 0
};

const defaultImages = [
  {
    id: 'fan1',
    name: 'Вентилятор основной',
    icon: '🌀',
    path: './img/fan.png',
    type: 'fan'
  },
  {
    id: 'fan2',
    name: 'Вентилятор',
    icon: '🌀',
    path: './img/fan2.png',
    type: 'fan'
  },
  {
    id: 'fire',
    name: 'Датчик пожарный',
    icon: '🔥',
    path: './img/fire.png',
    type: 'fire'
  },
  {
    id: 'fire2',
    name: 'Пожарный гидрант',
    icon: '🔥',
    path: './img/pozarniigidrant.png',
    type: 'fire'
  },
  {
    id: 'fire3',
    name: 'Пожарный склад',
    icon: '🔥',
    path: './img/scladprotivopozar.png',
    type: 'fire'
  },
  {
    id: 'valve',
    name: 'Дверь Закрытая',
    icon: '🔧',
    path: './img/dvercloses.png',
    type: 'valve'
  },
  {
    id: 'valve2',
    name: 'Дверь металлическая открытая',
    icon: '🔧',
    path: './img/dveropenmetall.png',
    type: 'valve'
  },
  {
    id: 'valve3',
    name: 'Дверь с вент решоткой',
    icon: '🔧',
    path: './img/dverventrech.png',
    type: 'valve'
  },
  {
    id: 'valve4',
    name: 'Дверь деревянная с вент окном',
    icon: '🔧',
    path: './img/dverwentoknowood.png',
    type: 'valve'
  },
  {
    id: 'valve5',
    name: 'Перемычка бетонная',
    icon: '🔧',
    path: './img/petemichkabeton.png',
    type: 'valve'
  },
  {
    id: 'valve6',
    name: 'Перемычка кирпичная',
    icon: '🔧',
    path: './img/petemichkakirpich.png',
    type: 'valve'
  },
  {
    id: 'valve7',
    name: 'Перемычка металличесая',
    icon: '🔧',
    path: './img/petemichkametall.png',
    type: 'valve'
  },
  {
    id: 'valve8',
    name: 'Перемычка деревянная',
    icon: '🔧',
    path: './img/petemichkawood.png',
    type: 'valve'
  },
  {
    id: 'valve9',
    name: 'Проход',
    icon: '🔧',
    path: './img/prohod.png',
    type: 'valve'
  },
  {
    id: 'valve10',
    name: 'Запасной вход',
    icon: '🔧',
    path: './img/zapasvhod.png',
    type: 'valve'
  },
  {
    id: 'pump',
    name: 'Насос погружной',
    icon: '⚙️',
    path: './img/nanospogruznoi.png',
    type: 'pump'
  },
  {
    id: 'pump2',
    name: 'Насосная станция',
    icon: '⚙️',
    path: './img/nasosnayastancia.png',
    type: 'pump'
  },
  {
    id: 'sensor',
    name: 'Самоходное оборудование',
    icon: '📡',
    path: './img/samohodnoe.png',
    type: 'sensor'
  },
  {
    id: 'sensor2',
    name: 'Люди',
    icon: '📡',
    path: './img/people.png',
    type: 'sensor'
  },
  {
    id: 'sensor3',
    name: 'Телефон',
    icon: '📡',
    path: './img/phone.png',
    type: 'sensor'
  },
  {
    id: 'sensor4',
    name: 'Взрывные работы',
    icon: '📡',
    path: './img/vzrivnieraboti.png',
    type: 'sensor'
  },
  {
    id: 'sensor5',
    name: 'Массовые взрывные работы',
    icon: '📡',
    path: './img/massovievzivniepaboti.png',
    type: 'sensor'
  },
  {
    id: 'sensor6',
    name: 'Медпункт',
    icon: '📡',
    path: './img/medpunkt.png',
    type: 'sensor'
  },
  {
    id: 'sensor7',
    name: 'Надшахтное оборудование',
    icon: '📡',
    path: './img/nadshahtnoe.png',
    type: 'sensor'
  }
];

let allImages = [...defaultImages];

try {
  const contextProto = CanvasRenderingContext2D.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(contextProto, 'textBaseline');
  const originalSetter = descriptor.set;

  Object.defineProperty(contextProto, 'textBaseline', {
    set: function (value) {
      const correctedValue = (value === 'alphabetical') ? 'alphabetic' : value;
      return originalSetter.call(this, correctedValue);
    },
    get: descriptor.get,
    configurable: true
  });
} catch (e) {
  console.error("Не удалось применить фикс для Chrome:", e);
}

// ==================== ОПТИМИЗИРОВАННЫЕ УТИЛИТЫ ====================
function roundTo5(value) {
  if (value === null || value === undefined) return value;
  return Math.round((value + Number.EPSILON) * 100000) / 100000;
}

function formatTo5(value) {
  if (value === null || value === undefined) return '0.00000';
  return roundTo5(value).toFixed(5);
}

function resetCalculationFlags() {
  isCalculatingAirVolumes = false;
  isDrawingImage = false;
  isProcessingEvents = false;
  console.log('Флаги расчета сброшены');
}

function invalidateCache() {
  cacheDirty = true;
  spatialGridDirty = true;
}

function getCachedObjects() {
  if (!cacheDirty && cachedAllObjects) {
    return {
      lines: cachedLines,
      images: cachedImages,
      all: cachedAllObjects
    };
  }

  const startTime = performance.now();
  const allObjects = canvas.getObjects();
  cachedAllObjects = allObjects;

  cachedLines = [];
  cachedImages = [];

  for (let i = 0; i < allObjects.length; i++) {
    const obj = allObjects[i];
    if (obj.type === 'line' && obj.id !== 'grid-line' && !obj.isPreview) {
      cachedLines.push(obj);
    } else if (obj.type === 'image' && obj.properties) {
      cachedImages.push(obj);
    }
  }

  cacheDirty = false;
  performanceMetrics.objectCount = allObjects.length;

  const endTime = performance.now();
  if (endTime - startTime > 10) {
    console.warn(`Кэширование заняло ${(endTime - startTime).toFixed(2)}ms`);
  }

  return {
    lines: cachedLines,
    images: cachedImages,
    all: cachedAllObjects
  };
}

function getCachedLines() {
  if (!cacheDirty && cachedLines) return cachedLines;
  getCachedObjects();
  return cachedLines;
}

function getCachedImages() {
  if (!cacheDirty && cachedImages) return cachedImages;
  getCachedObjects();
  return cachedImages;
}

function updateSpatialGrid() {
  if (!spatialGridDirty) return;

  const startTime = performance.now();
  spatialGrid.clear();

  const lines = getCachedLines();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const minX = Math.min(line.x1, line.x2);
    const maxX = Math.max(line.x1, line.x2);
    const minY = Math.min(line.y1, line.y2);
    const maxY = Math.max(line.y1, line.y2);

    const startCellX = Math.floor(minX / APP_CONFIG.SPATIAL_GRID_SIZE);
    const endCellX = Math.floor(maxX / APP_CONFIG.SPATIAL_GRID_SIZE);
    const startCellY = Math.floor(minY / APP_CONFIG.SPATIAL_GRID_SIZE);
    const endCellY = Math.floor(maxY / APP_CONFIG.SPATIAL_GRID_SIZE);

    for (let x = startCellX; x <= endCellX; x++) {
      for (let y = startCellY; y <= endCellY; y++) {
        const key = `${x},${y}`;
        if (!spatialGrid.has(key)) {
          spatialGrid.set(key, []);
        }
        spatialGrid.get(key).push(i);
      }
    }
  }

  spatialGridDirty = false;
  const endTime = performance.now();
  performanceMetrics.lastGraphUpdateTime = endTime - startTime;
}

function findLinesInArea(x, y, radius = APP_CONFIG.SNAP_RADIUS) {
  updateSpatialGrid();

  const cellX = Math.floor(x / APP_CONFIG.SPATIAL_GRID_SIZE);
  const cellY = Math.floor(y / APP_CONFIG.SPATIAL_GRID_SIZE);
  const lines = getCachedLines();
  const result = [];
  const checkedIndices = new Set();

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${cellX + dx},${cellY + dy}`;
      const cellIndices = spatialGrid.get(key);

      if (cellIndices) {
        for (const idx of cellIndices) {
          if (!checkedIndices.has(idx)) {
            checkedIndices.add(idx);
            const line = lines[idx];

            const closestPoint = findClosestPointOnLine({x, y}, line);
            const distance = Math.sqrt(
              Math.pow(x - closestPoint.x, 2) + Math.pow(y - closestPoint.y, 2)
            );

            if (distance < radius) {
              result.push({
                line: line,
                point: closestPoint,
                param: closestPoint.param,
                distance: distance
              });
            }
          }
        }
      }
    }
  }

  result.sort((a, b) => a.distance - b.distance);
  return result;
}

function scheduleRender() {
  if (renderTimeout) {
    cancelAnimationFrame(renderTimeout);
  }

  renderTimeout = requestAnimationFrame(() => {
    canvas.renderAll();
    renderTimeout = null;
  });
}

function debounceFunction(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttleFunction(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function () {
  initializeCanvas();
  updateImageLibrary();
  updateStatus();
  initializeModals();
  setupKeyboardShortcuts();
  setupAltKeyTracking();

  const nodeLockBtn = document.getElementById('nodeLockBtn');
  if (nodeLockBtn) {
    nodeLockBtn.innerHTML = nodeLockEnabled
      ? '<span>🔒</span> Узлы: ЗАБЛОКИРОВАНЫ'
      : '<span>🔓</span> Узлы: РАЗБЛОКИРОВАНЫ';
    nodeLockBtn.addEventListener('click', toggleNodeLock);
  }

  document.getElementById('calculateAirBtn')?.addEventListener('click', function () {
    if (!isCalculatingAirVolumes) {
      console.log('Запуск расчета объемов воздуха по клику кнопки...');

      if (confirm('Разбить все линии перед расчетом для более точного результата?')) {
        splitAllLinesBeforeCalculation();
      }

      calculateAirVolumesForAllLines(true);
    } else {
      showNotification('Расчет уже выполняется, подождите...', 'warning');
    }
  });

  document.getElementById('analyzePointsBtn')?.addEventListener('click', function () {
    console.log('=== ЗАПУСК АНАЛИЗА ТОЧЕК ПЕРЕСЕЧЕНИЯ ===');
    analyzeIntersectionPoints();
  });

  const testBtn = document.createElement('button');
  testBtn.innerHTML = '<span>🧪</span> Сложный тест';
  testBtn.className = 'toolbar-btn';
  testBtn.title = 'Создать сложный тестовый сценарий';
  testBtn.onclick = createTestScenarioComplex;
  document.querySelector('.toolbar')?.appendChild(testBtn);

  const balanceBtn = document.createElement('button');
  balanceBtn.innerHTML = '<span>⚖️</span> Проверить баланс';
  balanceBtn.className = 'toolbar-btn';
  balanceBtn.title = 'Проверить баланс потоков в сети';
  balanceBtn.onclick = checkFlowBalance;
  document.querySelector('.toolbar')?.appendChild(balanceBtn);

  window.addEventListener('resize', handleResize);
  console.log('Редактор технических чертежей загружен!');

  setInterval(updatePerformanceMetrics, 5000);
});

function updatePerformanceMetrics() {
  let metricsDiv = document.getElementById('performanceMetrics');
  if (!metricsDiv) {
    metricsDiv = document.createElement('div');
    metricsDiv.id = 'performanceMetrics';
    metricsDiv.style.cssText = 'position:fixed;bottom:10px;right:10px;background:rgba(0,0,0,0.7);color:white;padding:5px;font-size:10px;z-index:1000;border-radius:3px;';
    document.body.appendChild(metricsDiv);
  }

  const linesCount = getCachedLines().length;
  const imagesCount = getCachedImages().length;

  metricsDiv.innerHTML = `
    📊 Объектов: ${performanceMetrics.objectCount}<br>
    📏 Линий: ${linesCount}<br>
    🏭 Изображений: ${imagesCount}<br>
    ⚡ Граф: ${performanceMetrics.lastGraphUpdateTime.toFixed(1)}ms<br>
    ✂️ Пересечения: ${performanceMetrics.lastIntersectionTime.toFixed(1)}ms
  `;
}

function initializeCanvas() {
  canvas = new fabric.Canvas('fabric-canvas', {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true,
    selectionColor: 'rgba(74, 0, 224, 0.3)',
    selectionBorderColor: '#4A00E0',
    selectionLineWidth: 2,
    renderOnAddRemove: true,
    skipOffscreen: true,
    enableRetinaScaling: false
  });

  updateCanvasSize();
  drawGrid(APP_CONFIG.GRID_SIZE);
  setupCanvasEvents();
}

function updateCanvasSize() {
  if (!canvas) return;
  const wrapper = document.getElementById('canvas-wrapper');
  if (!wrapper) return;

  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;

  canvas.setDimensions({width, height});

  if (gridVisible) {
    drawGrid(APP_CONFIG.GRID_SIZE);
  }
  scheduleRender();
}

function handleResize() {
  debounceFunction(updateCanvasSize, 250);
}

// ==================== СЕТКА ====================
function drawGrid(gridSize = APP_CONFIG.GRID_SIZE) {
  const oldGrid = canvas ? canvas.getObjects().filter(obj => obj.id === 'grid-group') : [];
  oldGrid.forEach(obj => canvas.remove(obj));
  if (!gridVisible || !canvas) return;

  const width = canvas.width || 1200;
  const height = canvas.height || 700;
  const gridLines = [];

  for (let x = 0; x <= width; x += gridSize) {
    gridLines.push(new fabric.Line([x, 0, x, height], {
      stroke: 'rgba(224, 224, 224, 0.5)',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      id: 'grid-line'
    }));
  }

  for (let y = 0; y <= height; y += gridSize) {
    gridLines.push(new fabric.Line([0, y, width, y], {
      stroke: 'rgba(224, 224, 224, 0.5)',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      id: 'grid-line'
    }));
  }

  const gridGroup = new fabric.Group(gridLines, {
    selectable: false,
    evented: false,
    id: 'grid-group'
  });
  canvas.add(gridGroup);
  canvas.sendToBack(gridGroup);
  canvas.renderAll();
}

function toggleGrid() {
  gridVisible = !gridVisible;
  const btn = document.getElementById('gridToggleBtn');
  if (gridVisible) {
    btn.innerHTML = '<span>🔲</span> Сетка (ВКЛ)';
    drawGrid(APP_CONFIG.GRID_SIZE);
    showNotification('Сетка включена', 'success');
  } else {
    btn.innerHTML = '<span>🔲</span> Сетка (ВЫКЛ)';
    drawGrid(APP_CONFIG.GRID_SIZE);
    showNotification('Сетка отключена', 'info');
  }
  canvas.renderAll();
}

function snapToGrid(value, gridSize = APP_CONFIG.GRID_SIZE) {
  return roundTo5(Math.round(value / gridSize) * gridSize);
}

// ==================== УПРАВЛЕНИЕ ОБЪЕКТАМИ ====================
function getObjectCenter(obj) {
  const width = roundTo5(obj.width * obj.scaleX);
  const height = roundTo5(obj.height * obj.scaleY);
  return {
    x: roundTo5(obj.left),
    y: roundTo5(obj.top),
    width: width,
    height: height
  };
}

function getObjectRect(obj) {
  const width = roundTo5(obj.width * obj.scaleX);
  const height = roundTo5(obj.height * obj.scaleY);
  return {
    left: roundTo5(obj.left - width / 2),
    right: roundTo5(obj.left + width / 2),
    top: roundTo5(obj.top - height / 2),
    bottom: roundTo5(obj.top + height / 2)
  };
}

function findClosestPointOnLine(point, line) {
  const x1 = line.x1, y1 = line.y1;
  const x2 = line.x2, y2 = line.y2;
  const A = roundTo5(point.x - x1);
  const B = roundTo5(point.y - y1);
  const C = roundTo5(x2 - x1);
  const D = roundTo5(y2 - y1);
  const dot = roundTo5(A * C + B * D);
  const lenSq = roundTo5(C * C + D * D);
  let param = -1;
  if (lenSq !== 0) param = roundTo5(dot / lenSq);

  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = roundTo5(x1 + param * C);
    yy = roundTo5(y1 + param * D);
  }

  const dx = roundTo5(xx - point.x);
  const dy = roundTo5(yy - point.y);
  const distance = roundTo5(Math.sqrt(dx * dx + dy * dy));

  return {x: roundTo5(xx), y: roundTo5(yy), param: param, distance: distance};
}

function findClosestPointOnObjectEdge(object, point) {
  if (!object || !point) return null;
  const objRect = getObjectRect(object);
  const center = getObjectCenter(object);

  if (object.type === 'image' || object.type === 'rect') {
    const left = objRect.left, right = objRect.right, top = objRect.top,
      bottom = objRect.bottom;
    const isInside = point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;

    if (isInside) {
      const distToLeft = roundTo5(Math.abs(point.x - left));
      const distToRight = roundTo5(Math.abs(point.x - right));
      const distToTop = roundTo5(Math.abs(point.y - top));
      const distToBottom = roundTo5(Math.abs(point.y - bottom));
      const minDist = roundTo5(Math.min(distToLeft, distToRight, distToTop, distToBottom));

      if (minDist === distToLeft) return {
        x: roundTo5(left),
        y: roundTo5(point.y),
        edge: 'left'
      };
      else if (minDist === distToRight) return {
        x: roundTo5(right),
        y: roundTo5(point.y),
        edge: 'right'
      };
      else if (minDist === distToTop) return {
        x: roundTo5(point.x),
        y: roundTo5(top),
        edge: 'top'
      };
      else return {
          x: roundTo5(point.x),
          y: roundTo5(bottom),
          edge: 'bottom'
        };
    } else {
      let closestX = roundTo5(Math.max(left, Math.min(point.x, right)));
      let closestY = roundTo5(Math.max(top, Math.min(point.y, bottom)));
      const distToLeft = roundTo5(Math.abs(point.x - left));
      const distToRight = roundTo5(Math.abs(point.x - right));
      const distToTop = roundTo5(Math.abs(point.y - top));
      const distToBottom = roundTo5(Math.abs(point.y - bottom));
      const minDist = roundTo5(Math.min(distToLeft, distToRight, distToTop, distToBottom));

      if (minDist === distToLeft || minDist === distToRight) closestY = roundTo5(point.y);
      else closestX = roundTo5(point.x);

      closestX = roundTo5(Math.max(left, Math.min(closestX, right)));
      closestY = roundTo5(Math.max(top, Math.min(closestY, bottom)));
      return {
        x: closestX,
        y: closestY,
        edge: 'nearest'
      };
    }
  }

  return {
    x: roundTo5(Math.max(objRect.left, Math.min(point.x, objRect.right))),
    y: roundTo5(Math.max(objRect.top, Math.min(point.y, objRect.bottom))),
    edge: 'center'
  };
}

// ==================== ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ УЗЛАМИ ====================
function buildConnectionGraph() {
  if (isProcessingEvents) return;
  isProcessingEvents = true;

  const startTime = performance.now();

  try {
    connectionNodes.clear();
    const lines = getCachedLines();

    const nodeMap = new Map();

    lines.forEach(line => {
      const startKey = `${roundTo5(line.x1)}_${roundTo5(line.y1)}`;
      const endKey = `${roundTo5(line.x2)}_${roundTo5(line.y2)}`;

      if (!nodeMap.has(startKey)) {
        nodeMap.set(startKey, {
          x: roundTo5(line.x1),
          y: roundTo5(line.y1),
          lines: [],
          locked: nodeLockEnabled
        });
      }

      const startNode = nodeMap.get(startKey);
      let exists = false;
      for (let i = 0; i < startNode.lines.length; i++) {
        if (startNode.lines[i].line.id === line.id) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        startNode.lines.push({
          line: line,
          isStart: true,
          originalX: roundTo5(line.x1),
          originalY: roundTo5(line.y1)
        });
      }

      if (!nodeMap.has(endKey)) {
        nodeMap.set(endKey, {
          x: roundTo5(line.x2),
          y: roundTo5(line.y2),
          lines: [],
          locked: nodeLockEnabled
        });
      }

      const endNode = nodeMap.get(endKey);
      exists = false;
      for (let i = 0; i < endNode.lines.length; i++) {
        if (endNode.lines[i].line.id === line.id) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        endNode.lines.push({
          line: line,
          isStart: false,
          originalX: roundTo5(line.x2),
          originalY: roundTo5(line.y2)
        });
      }
    });

    for (const [key, node] of nodeMap.entries()) {
      if (node.lines.length > 1) {
        connectionNodes.set(key, node);
      }
    }

    const endTime = performance.now();
    if (endTime - startTime > 50) {
      console.warn(`Построение графа заняло ${(endTime - startTime).toFixed(2)}ms`);
    }
  } finally {
    isProcessingEvents = false;
  }
}

function updateConnectionGraph() {
  if (isUpdatingConnections) return;
  isUpdatingConnections = true;

  if (updateGraphTimeout) {
    clearTimeout(updateGraphTimeout);
  }

  updateGraphTimeout = setTimeout(() => {
    try {
      buildConnectionGraph();
      bringIntersectionPointsToFront();
    } catch (error) {
      console.error('Ошибка в updateConnectionGraph:', error);
    } finally {
      isUpdatingConnections = false;
      updateGraphTimeout = null;
    }
  }, 100);
}

function toggleNodeLock() {
  nodeLockEnabled = !nodeLockEnabled;

  connectionNodes.forEach(node => {
    node.locked = nodeLockEnabled;
  });

  const nodeLockBtn = document.getElementById('nodeLockBtn');
  if (nodeLockBtn) {
    nodeLockBtn.innerHTML = nodeLockEnabled
      ? '<span>🔒</span> Узлы: ЗАБЛОКИРОВАНЫ'
      : '<span>🔓</span> Узлы: РАЗБЛОКИРОВАНЫ';
  }

  showNotification(
    nodeLockEnabled
      ? 'Узлы заблокированы - линии нельзя разделять'
      : 'Узлы разблокированы - можно разделять линии',
    nodeLockEnabled ? 'warning' : 'info'
  );

  updateConnectionGraph();
  scheduleRender();
}

function isPointInLockedNode(x, y, threshold = APP_CONFIG.NODE_THRESHOLD) {
  for (const [key, node] of connectionNodes.entries()) {
    if (!node.locked) continue;

    const distance = Math.sqrt(
      Math.pow(x - node.x, 2) +
      Math.pow(y - node.y, 2)
    );

    if (distance < threshold) {
      return {node, distance};
    }
  }
  return null;
}

// ==================== ФУНКЦИИ ДЛЯ ОБЪЕМА ВОЗДУХА ====================
function createOrUpdateAirVolumeText(line) {
  if (line.airVolumeText) {
    try {
      canvas.remove(line.airVolumeText);
    } catch (e) {
    }
    line.airVolumeText = null;
  }

  if (!line.properties || line.properties.airVolume === undefined || line.properties.airVolume === null) {
    return;
  }

  try {
    const midX = (line.x1 + line.x2) / 2;
    const midY = (line.y1 + line.y2) / 2;

    const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);
    const degrees = angle * (180 / Math.PI);

    const offset = 25;
    const offsetX = Math.sin(angle) * offset;
    const offsetY = -Math.cos(angle) * offset;

    const airVolumeValue = roundTo5(line.properties.airVolume);
    const displayValue = airVolumeValue.toFixed(3);

    const textOptions = {
      left: midX + offsetX,
      top: midY + offsetY,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fill: '#2d3436',
      fontWeight: 'bold',
      textBackgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: 4,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
      angle: degrees,
      lockMovementX: true,
      lockMovementY: true,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      hasControls: false,
      hasBorders: false
    };

    const airVolumeText = new fabric.Text(`${displayValue} м³/с`, textOptions);
    line.airVolumeText = airVolumeText;
    canvas.add(airVolumeText);
    airVolumeText.bringToFront();

    return airVolumeText;
  } catch (error) {
    console.error('Ошибка при создании текста объема воздуха:', error);
    return null;
  }
}

function updateAllAirVolumeTexts() {
  if (updateTextsTimeout) {
    clearTimeout(updateTextsTimeout);
  }

  updateTextsTimeout = setTimeout(() => {
    const lines = getCachedLines();
    let updatedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      try {
        if (line.properties && line.properties.airVolume !== undefined) {
          createOrUpdateAirVolumeText(line);
          updatedCount++;
        }
      } catch (err) {
        console.warn('Ошибка при обновлении текста линии:', err, line);
      }
    }

    scheduleRender();
    updateTextsTimeout = null;

    return updatedCount;
  }, 100);
}

function removeAirVolumeText(line) {
  if (line.airVolumeText) {
    canvas.remove(line.airVolumeText);
    line.airVolumeText = null;
  }
}

// ==================== РАСЧЕТНЫЕ ФУНКЦИИ ====================
function calculateLinePerimeter(crossSectionalArea) {
  return roundTo5(3.8 * Math.sqrt(crossSectionalArea));
}

function calculateAirResistance(roughnessCoefficient, perimeter, passageLength, crossSectionalArea) {
  if (crossSectionalArea === 0) return 0;
  return roundTo5((roughnessCoefficient * perimeter * passageLength) / crossSectionalArea);
}

function calculateAllLineProperties(line) {
  if (!line.properties) return;
  const props = line.properties;

  if (props.crossSectionalArea !== undefined) {
    props.perimeter = calculateLinePerimeter(props.crossSectionalArea);
  }

  if (props.roughnessCoefficient !== undefined &&
    props.perimeter !== undefined &&
    props.passageLength !== undefined &&
    props.crossSectionalArea !== undefined) {
    props.airResistance = calculateAirResistance(
      props.roughnessCoefficient,
      props.perimeter,
      props.passageLength,
      props.crossSectionalArea
    );
  }
  return props;
}

function normalizeLineProperties(line) {
  if (!line.properties) return;
  const props = line.properties;

  if (props.L !== undefined) {
    props.passageLength = roundTo5(props.L);
    delete props.L;
  }
  if (props.K !== undefined) {
    props.crossSectionalArea = roundTo5(props.K);
    delete props.K;
  }
  if (props.I !== undefined) {
    props.roughnessCoefficient = roundTo5(props.I);
    delete props.I;
  }

  calculateAllLineProperties(line);
  line.set('properties', props);
}

// ==================== КЛЮЧЕВЫЕ ИСПРАВЛЕНИЯ: ГЕНЕРАЦИЯ ID И РАЗДЕЛЕНИЕ ЛИНИЙ ====================
function generateLineId() {
  return 'line_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function splitLineAtPoint(line, point) {
  const nodeCheck = isPointInLockedNode(point.x, point.y);
  if (nodeCheck && nodeCheck.node.locked) {
    showNotification('Нельзя разделить линию в заблокированном узле!', 'error');
    return null;
  }

  const closestPoint = findClosestPointOnLine(point, line);
  if (closestPoint.distance > 10) {
    return null;
  }

  const dx1 = roundTo5(point.x - line.x1);
  const dy1 = roundTo5(point.y - line.y1);
  const dx2 = roundTo5(point.x - line.x2);
  const dy2 = roundTo5(point.y - line.y2);
  const distance1 = roundTo5(Math.sqrt(dx1 * dx1 + dy1 * dy1));
  const distance2 = roundTo5(Math.sqrt(dx2 * dx2 + dy2 * dy2));

  if (distance1 < 5 || distance2 < 5) return null;

  const totalLength = roundTo5(Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2)));
  if (totalLength < 10) return null;

  normalizeLineProperties(line);
  const props = line.properties || {};

  const proportion1 = roundTo5(distance1 / totalLength);
  const proportion2 = roundTo5(distance2 / totalLength);

  const line1Id = generateLineId();
  const line2Id = generateLineId();

  const props1 = JSON.parse(JSON.stringify(props));
  const props2 = JSON.parse(JSON.stringify(props));

  props1.name = `${props.name || 'Линия'} (часть 1)`;
  props2.name = `${props.name || 'Линия'} (часть 2)`;

  props1.length = distance1;
  props2.length = distance2;

  props1.passageLength = roundTo5((props.passageLength || 0.5) * proportion1);
  props2.passageLength = roundTo5((props.passageLength || 0.5) * proportion2);

  if (props.crossSectionalArea && props.roughnessCoefficient) {
    const perimeter = calculateLinePerimeter(props.crossSectionalArea);
    props1.airResistance = calculateAirResistance(
      props.roughnessCoefficient,
      perimeter,
      props1.passageLength,
      props.crossSectionalArea
    );
    props2.airResistance = calculateAirResistance(
      props.roughnessCoefficient,
      perimeter,
      props2.passageLength,
      props.crossSectionalArea
    );
  }

  if (props.airVolume !== undefined) {
    if (line.lineStartsFromObject && line.startObject) {
      props1.airVolume = roundTo5(props.airVolume);
      props2.airVolume = 0;
    } else {
      props1.airVolume = roundTo5(props.airVolume * proportion1);
      props2.airVolume = roundTo5(props.airVolume * proportion2);
    }
  }

  delete props1.startsFromObject;
  delete props2.startsFromObject;

  const line1 = new fabric.Line([line.x1, line.y1, point.x, point.y], {
    stroke: line.stroke,
    strokeWidth: line.strokeWidth,
    strokeDashArray: line.strokeDashArray,
    fill: false,
    strokeLineCap: 'round',
    hasControls: true,
    hasBorders: true,
    lockRotation: false,
    id: line1Id,
    properties: props1
  });

  const line2 = new fabric.Line([point.x, point.y, line.x2, line.y2], {
    stroke: line.stroke,
    strokeWidth: line.strokeWidth,
    strokeDashArray: line.strokeDashArray,
    fill: false,
    strokeLineCap: 'round',
    hasControls: true,
    hasBorders: true,
    lockRotation: false,
    id: line2Id,
    properties: props2
  });

  if (line.lineStartsFromObject && line.startObject && line.x1 === line1.x1 && line.y1 === line1.y1) {
    line1.lineStartsFromObject = true;
    line1.startObject = line.startObject;
    if (line1.properties) {
      line1.properties.startsFromObject = {
        objectId: line.startObject.id || line.startObject._id,
        objectType: line.startObject.type,
        objectName: line.startObject.properties?.name || 'Объект'
      };
    }
  }

  return {line1, line2};
}

// ==================== НОВАЯ СИСТЕМА РАСЧЕТА ВОЗДУШНЫХ ПОТОКОВ (ПО НАПРАВЛЕНИЮ ДВИЖЕНИЯ) ====================

// ==================== ИСПРАВЛЕННАЯ ФУНКЦИЯ РАСЧЕТА ВОЗДУШНЫХ ПОТОКОВ ====================
function calculateAirVolumesForAllLines(isManual = false) {
  if (!isManual) {
    console.log('Расчет вызван не через кнопку, пропускаем');
    return false;
  }

  if (isCalculatingAirVolumes) {
    showNotification('Расчет уже выполняется, подождите...', 'warning');
    return false;
  }

  isCalculatingAirVolumes = true;
  console.log('=== НАЧИНАЕМ РАСЧЕТ ВОЗДУШНЫХ ПОТОКОВ ===');

  try {
    const lines = getCachedLines();
    const images = getCachedImages();

    // 1. Сначала обнуляем все потоки
    lines.forEach(line => {
      if (line.properties) {
        line.properties.airVolume = 0;
      }
    });

    // 2. Строим граф сети
    const graph = buildFlowGraph(lines, images);

    // 3. Находим все источники
    const sources = findAirSources(graph);

    if (sources.length === 0) {
      showNotification('Нет источников воздуха! Добавьте объекты с объемом воздуха > 0', 'warning');
      isCalculatingAirVolumes = false;
      return false;
    }

    console.log(`Найдено источников: ${sources.length}`);
    sources.forEach((source, idx) => {
      console.log(`  Источник ${idx + 1}: узел ${source.nodeId}, объем ${source.volume.toFixed(3)} м³/с`);
    });

    // 4. Выполняем расчет для каждого источника
    const flowMap = calculateFlowsFromSources(graph, sources);

    // 5. Применяем результаты к линиям
    applyFlowResults(lines, flowMap);

    // 6. Проверяем баланс
    const balanceResult = checkNetworkBalance(lines);

    // 7. Обновляем отображение
    updateAllAirVolumeTexts();
    scheduleRender();
    updatePropertiesPanel();

    const totalFlow = calculateTotalFlow(lines);

    console.log(`\n=== РАСЧЕТ ЗАВЕРШЕН ===`);
    console.log(`Суммарный поток: ${totalFlow.toFixed(3)} м³/с`);
    console.log(`Несбалансированных узлов: ${balanceResult.unbalancedCount}`);

    if (balanceResult.unbalancedCount === 0) {
      showNotification(`Расчет завершен! Суммарный поток: ${totalFlow.toFixed(3)} м³/с`, 'success');
    } else {
      showNotification(`Расчет завершен, но есть ${balanceResult.unbalancedCount} несбалансированных узлов`, 'warning');
    }

    return true;

  } catch (error) {
    console.error('ОШИБКА в calculateAirVolumesForAllLines:', error);
    showNotification('Ошибка при расчете: ' + error.message, 'error');
    return false;
  } finally {
    isCalculatingAirVolumes = false;
  }
}

// Построение графа потоков
function buildFlowGraph(lines, images) {
  const nodes = new Map(); // Узлы графа
  const edges = new Map(); // Ребра (линии)

  // Создаем узлы из линий
  lines.forEach(line => {
    const startKey = `${roundTo5(line.x1)}_${roundTo5(line.y1)}`;
    const endKey = `${roundTo5(line.x2)}_${roundTo5(line.y2)}`;

    // Узел начала
    if (!nodes.has(startKey)) {
      nodes.set(startKey, {
        id: startKey,
        x: roundTo5(line.x1),
        y: roundTo5(line.y1),
        incomingEdges: [],  // Входящие линии (конец здесь)
        outgoingEdges: [],  // Исходящие линии (начало здесь)
        objects: [],        // Объекты в узле
        totalIncomingFlow: 0,
        totalOutgoingFlow: 0,
        processed: false,
        distance: Infinity  // Расстояние от источника
      });
    }

    // Узел конца
    if (!nodes.has(endKey)) {
      nodes.set(endKey, {
        id: endKey,
        x: roundTo5(line.x2),
        y: roundTo5(line.y2),
        incomingEdges: [],
        outgoingEdges: [],
        objects: [],
        totalIncomingFlow: 0,
        totalOutgoingFlow: 0,
        processed: false,
        distance: Infinity
      });
    }

    const startNode = nodes.get(startKey);
    const endNode = nodes.get(endKey);

    // Ребро (линия)
    const edge = {
      id: line.id,
      line: line,
      fromNode: startKey,
      toNode: endKey,
      resistance: line.properties?.airResistance || 1,
      length: Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2)),
      flow: 0
    };

    edges.set(line.id, edge);

    // Добавляем ребро в узлы
    startNode.outgoingEdges.push(edge);
    endNode.incomingEdges.push(edge);
  });

  // Добавляем объекты к узлам
  images.forEach(img => {
    const center = getObjectCenter(img);
    const imgVolume = img.properties?.airVolume || 0;
    const imgResistance = img.properties?.airResistance || 1;

    // Ищем ближайший узел
    let closestNode = null;
    let minDistance = Infinity;

    nodes.forEach((node, nodeId) => {
      const distance = Math.sqrt(
        Math.pow(node.x - center.x, 2) +
        Math.pow(node.y - center.y, 2)
      );

      if (distance < minDistance && distance < 50) {
        minDistance = distance;
        closestNode = node;
      }
    });

    if (closestNode) {
      closestNode.objects.push({
        object: img,
        name: img.properties?.name || 'Объект',
        airVolume: imgVolume,
        airResistance: imgResistance
      });
    }
  });

  return {nodes, edges};
}

// Поиск всех источников воздуха
function findAirSources(graph) {
  const sources = [];

  graph.nodes.forEach((node, nodeId) => {
    // Узел является источником, если:
    // 1. В нем есть объект с объемом воздуха > 0
    // 2. ИЛИ нет входящих линий (начало сети)

    const hasSourceObject = node.objects.some(obj => obj.airVolume > 0);

    if (hasSourceObject) {
      // Суммируем объемы от всех объектов в узле
      let totalVolume = 0;
      node.objects.forEach(obj => {
        if (obj.airVolume > 0) {
          totalVolume += obj.airVolume;
        }
      });

      sources.push({
        nodeId: nodeId,
        node: node,
        volume: totalVolume,
        type: 'object'
      });

      // Учитываем сопротивление объекта
      node.objects.forEach(obj => {
        if (obj.airResistance > 1 && obj.airVolume > 0) {
          totalVolume = totalVolume / obj.airResistance;
        }
      });

      console.log(`Источник в узле ${nodeId}: объем ${totalVolume.toFixed(3)} м³/с`);

    } else if (node.incomingEdges.length === 0 && node.outgoingEdges.length > 0) {
      // Начало сети без источника (нулевой поток)
      sources.push({
        nodeId: nodeId,
        node: node,
        volume: 0,
        type: 'network_start'
      });
    }
  });

  return sources;
}

// Расчет потоков от источников (BFS от источников)
function calculateFlowsFromSources(graph, sources) {
  const flowMap = new Map(); // lineId -> flow
  const nodeDistance = new Map(); // nodeId -> distance from sources

  // Инициализируем расстояния
  graph.nodes.forEach((node, nodeId) => {
    nodeDistance.set(nodeId, Infinity);
    node.processed = false;
  });

  // Очередь для BFS
  const queue = [];

  // Добавляем все источники в очередь с расстоянием 0
  sources.forEach(source => {
    nodeDistance.set(source.nodeId, 0);
    queue.push({
      nodeId: source.nodeId,
      node: source.node,
      incomingVolume: source.volume
    });
  });

  // Сортируем источники по объему (сначала большие)
  queue.sort((a, b) => b.incomingVolume - a.incomingVolume);

  console.log('\n=== ПОРЯДОК ОБРАБОТКИ УЗЛОВ ===');

  // Обрабатываем узлы в порядке очереди
  while (queue.length > 0) {
    const current = queue.shift();
    const nodeId = current.nodeId;
    const node = current.node;
    let availableVolume = current.incomingVolume;

    if (node.processed) {
      // Узел уже обработан - добавляем поток к существующему
      console.log(`Узел ${nodeId} уже обработан, добавляем поток ${availableVolume.toFixed(3)}`);

      // Перераспределяем существующие потоки
      node.outgoingEdges.forEach(edge => {
        const existingFlow = flowMap.get(edge.id) || 0;
        const totalOutgoing = node.outgoingEdges.reduce((sum, e) => sum + (flowMap.get(e.id) || 0), 0);

        if (totalOutgoing > 0) {
          const proportion = existingFlow / totalOutgoing;
          const additionalFlow = availableVolume * proportion;
          flowMap.set(edge.id, existingFlow + additionalFlow);
        }
      });

      continue;
    }

    node.processed = true;

    console.log(`\nОбработка узла ${nodeId}: доступный объем = ${availableVolume.toFixed(3)} м³/с`);
    console.log(`  Входящих линий: ${node.incomingEdges.length}, Исходящих: ${node.outgoingEdges.length}`);

    // Если нет исходящих линий - тупик
    if (node.outgoingEdges.length === 0) {
      console.log(`  Узел ${nodeId} - тупик, поток не распределяется`);
      continue;
    }

    // Учитываем сопротивление объектов в узле
    let resistanceFactor = 1;
    node.objects.forEach(obj => {
      if (obj.airResistance > 1) {
        resistanceFactor = resistanceFactor / obj.airResistance;
        console.log(`  Учитываем сопротивление объекта ${obj.name}: ${obj.airResistance}`);
      }
    });

    availableVolume = availableVolume * resistanceFactor;

    // Если одна исходящая линия - весь поток ей
    if (node.outgoingEdges.length === 1) {
      const edge = node.outgoingEdges[0];
      const flow = availableVolume;

      flowMap.set(edge.id, (flowMap.get(edge.id) || 0) + flow);
      console.log(`  Одна исходящая линия: поток ${flow.toFixed(3)} м³/с`);

      // Добавляем следующий узел в очередь
      const nextNode = graph.nodes.get(edge.toNode);
      if (nextNode) {
        const newDistance = nodeDistance.get(nodeId) + 1;
        if (newDistance < nodeDistance.get(edge.toNode)) {
          nodeDistance.set(edge.toNode, newDistance);
        }

        queue.push({
          nodeId: edge.toNode,
          node: nextNode,
          incomingVolume: flow
        });
      }
    }
    // Несколько исходящих линий - распределяем по проводимости
    else if (node.outgoingEdges.length > 1) {
      // Вычисляем суммарную проводимость
      let totalConductivity = 0;
      const conductivities = [];

      node.outgoingEdges.forEach(edge => {
        const conductivity = edge.resistance > 0 ? 1 / edge.resistance : 1;
        totalConductivity += conductivity;
        conductivities.push({
          edge: edge,
          conductivity: conductivity
        });
      });

      console.log(`  Суммарная проводимость: ${totalConductivity.toFixed(3)}`);

      // Распределяем поток
      conductivities.forEach(item => {
        const flow = availableVolume * (item.conductivity / totalConductivity);
        flowMap.set(item.edge.id, (flowMap.get(item.edge.id) || 0) + flow);
        console.log(`  Линия ${item.edge.id}: поток ${flow.toFixed(3)} м³/с (проводимость ${item.conductivity.toFixed(3)})`);

        // Добавляем следующий узел в очередь
        const nextNode = graph.nodes.get(item.edge.toNode);
        if (nextNode) {
          const newDistance = nodeDistance.get(nodeId) + 1;
          if (newDistance < nodeDistance.get(item.edge.toNode)) {
            nodeDistance.set(item.edge.toNode, newDistance);
          }

          queue.push({
            nodeId: item.edge.toNode,
            node: nextNode,
            incomingVolume: flow
          });
        }
      });
    }
  }

  return flowMap;
}

// Применение результатов к линиям
function applyFlowResults(lines, flowMap) {
  let updatedCount = 0;

  lines.forEach(line => {
    const flow = flowMap.get(line.id);

    if (flow !== undefined) {
      if (!line.properties) {
        line.properties = {};
      }

      const oldFlow = line.properties.airVolume || 0;
      const newFlow = roundTo5(flow);

      if (Math.abs(oldFlow - newFlow) > 0.001) {
        line.properties.airVolume = newFlow;
        line.set('properties', line.properties);
        updatedCount++;
      }
    }
  });

  console.log(`\nОбновлено ${updatedCount} линий из ${lines.length}`);
  return updatedCount;
}

// Проверка баланса в сети
function checkNetworkBalance(lines) {
  console.log('\n=== ПРОВЕРКА БАЛАНСА ===');

  const nodes = new Map();
  let unbalancedCount = 0;
  let totalFlow = 0;

  // Собираем потоки по узлам
  lines.forEach(line => {
    const startKey = `${roundTo5(line.x1)}_${roundTo5(line.y1)}`;
    const endKey = `${roundTo5(line.x2)}_${roundTo5(line.y2)}`;
    const flow = line.properties?.airVolume || 0;
    totalFlow += flow;

    if (!nodes.has(startKey)) {
      nodes.set(startKey, {incoming: 0, outgoing: 0, id: startKey});
    }
    if (!nodes.has(endKey)) {
      nodes.set(endKey, {incoming: 0, outgoing: 0, id: endKey});
    }

    nodes.get(startKey).outgoing += flow;
    nodes.get(endKey).incoming += flow;
  });

  console.log(`Общий поток в системе: ${totalFlow.toFixed(3)} м³/с`);

  // Проверяем баланс в каждом узле
  nodes.forEach((node, nodeId) => {
    const imbalance = Math.abs(node.incoming - node.outgoing);

    if (imbalance > 0.001) {
      console.log(`🔴 Узел ${nodeId}: разбаланс ${imbalance.toFixed(4)}`);
      console.log(`   Входящие: ${node.incoming.toFixed(4)}, Исходящие: ${node.outgoing.toFixed(4)}`);
      unbalancedCount++;
    }
  });

  if (unbalancedCount === 0) {
    console.log('✅ Все узлы сбалансированы!');
  } else {
    console.log(`⚠️ Найдено ${unbalancedCount} несбалансированных узлов`);
  }

  return {unbalancedCount, totalFlow};
}

// Расчет общего потока
function calculateTotalFlow(lines) {
  let total = 0;

  lines.forEach(line => {
    if (line.properties?.airVolume) {
      total += line.properties.airVolume;
    }
  });

  return roundTo5(total);
}

// Функция проверки баланса (для вызова из UI)
function checkFlowBalance() {
  const lines = getCachedLines();
  const result = checkNetworkBalance(lines);

  if (result.unbalancedCount === 0) {
    showNotification(`Баланс соблюден! Общий поток: ${result.totalFlow.toFixed(3)} м³/с`, 'success');
  } else {
    showNotification(`Обнаружено ${result.unbalancedCount} несбалансированных узлов`, 'warning');
  }

  return result.unbalancedCount;
}

// ==================== ТЕСТОВАЯ ФУНКЦИЯ ДЛЯ ПРОВЕРКИ ====================
function createTestScenarioComplex() {
  clearCanvas();

  console.log('Создание сложного тестового сценария...');

  const sources = [
    {x: 100, y: 100, volume: 10, name: 'Вентилятор 1'},
    {x: 400, y: 300, volume: 5, name: 'Вентилятор 2'},
    {x: 700, y: 100, volume: 8, name: 'Вентилятор 3'}
  ];

  const lines = [
    {x1: 100, y1: 100, x2: 200, y2: 100, name: 'Линия 1-2'},
    {x1: 200, y1: 100, x2: 200, y2: 200, name: 'Линия 2-3'},
    {x1: 200, y1: 100, x2: 300, y2: 100, name: 'Линия 2-4'},
    {x1: 200, y1: 200, x2: 300, y2: 100, name: 'Линия 3-4'},
    {x1: 400, y1: 300, x2: 400, y2: 200, name: 'Линия 5-6'},
    {x1: 400, y1: 200, x2: 300, y2: 100, name: 'Линия 6-4'},
    {x1: 400, y1: 300, x2: 500, y2: 300, name: 'Линия 5-7'},
    {x1: 700, y1: 100, x2: 600, y2: 100, name: 'Линия 8-9'},
    {x1: 600, y1: 100, x2: 500, y2: 300, name: 'Линия 9-7'},
    {x1: 500, y1: 300, x2: 300, y2: 100, name: 'Линия 7-4'},
    {x1: 300, y1: 100, x2: 400, y2: 100, name: 'Линия 4-10'},
    {x1: 400, y1: 100, x2: 500, y2: 100, name: 'Линия 10-11'},
    {x1: 500, y1: 100, x2: 600, y2: 100, name: 'Линия 11-9'}
  ];

  sources.forEach((source, index) => {
    fabric.Image.fromURL('./img/fan.png', function (img) {
      img.set({
        left: source.x,
        top: source.y,
        scaleX: 0.5,
        scaleY: 0.5,
        properties: {
          name: source.name,
          type: 'fan',
          airVolume: source.volume,
          airResistance: 1
        }
      });
      canvas.add(img);

      if (index === 0) {
        const line = lines[0];
        const lineObj = new fabric.Line([source.x, source.y, line.x2, line.y2], {
          stroke: '#4A00E0',
          strokeWidth: 5,
          properties: {
            name: line.name,
            airResistance: 1 + Math.random() * 2,
            airVolume: 0
          },
          id: 'line_' + Date.now() + '_' + index
        });
        canvas.add(lineObj);
        lineObj.lineStartsFromObject = true;
        lineObj.startObject = img;
      }
    });
  });

  setTimeout(() => {
    const shuffledLines = [...lines.slice(1)];
    shuffledLines.sort(() => Math.random() - 0.5);

    shuffledLines.forEach((line, index) => {
      setTimeout(() => {
        const lineObj = new fabric.Line([line.x1, line.y1, line.x2, line.y2], {
          stroke: '#4A00E0',
          strokeWidth: 5,
          properties: {
            name: line.name,
            airResistance: 1 + Math.random() * 2,
            airVolume: 0
          },
          id: 'line_' + Date.now() + '_' + (index + 3)
        });
        canvas.add(lineObj);

        if (index === shuffledLines.length - 1) {
          setTimeout(() => {
            invalidateCache();
            updateConnectionGraph();
            showNotification('Сложный тестовый сценарий создан. Нажмите "Расчет воздуха"', 'success');
          }, 500);
        }
      }, index * 50);
    });
  }, 1000);
}

function splitAllLinesBeforeCalculation() {
  console.log('Принудительное разбиение всех линий перед расчетом...');
  splitAllLines();
  splitAllLinesAtObjectCenters();
  updateConnectionGraph();
  showNotification('Все линии разбиты перед расчетом', 'info');
  return true;
}

// ==================== СОБЫТИЯ КАНВАСА ====================
function setupCanvasEvents() {
  if (!canvas) return;

  canvas.on('mouse:down', handleCanvasMouseDown);
  canvas.on('mouse:move', throttleFunction(handleCanvasMouseMove, 16));
  canvas.on('mouse:out', handleCanvasMouseOut);
  canvas.on('mouse:dblclick', handleCanvasDoubleClick);
  canvas.on('selection:created', updatePropertiesPanel);
  canvas.on('selection:updated', updatePropertiesPanel);
  canvas.on('selection:cleared', updatePropertiesPanel);
  canvas.on('object:added', handleObjectAdded);
  canvas.on('object:modified', handleObjectModified);
  canvas.on('object:removed', handleObjectRemoved);
}

function findLineAtPoint(point, threshold = APP_CONFIG.SNAP_RADIUS) {
  const candidates = findLinesInArea(point.x, point.y, threshold);

  if (candidates.length > 0) {
    const closest = candidates[0];
    const isEnd = closest.param < 0.05 || closest.param > 0.95;
    return {
      line: closest.line,
      point: closest.point,
      param: closest.param,
      isEnd: isEnd
    };
  }

  return null;
}

function handleCanvasMouseDown(options) {
  const pointer = canvas.getPointer(options.e);

  if (options.e.shiftKey && currentImageData) {
    setTimeout(() => {
      addImageAtPosition(pointer.x, pointer.y);
    }, 10);
    return;
  }

  if (isDrawingLine) {
    handleLineDrawingStart(options, pointer);
    return;
  }

  if (options.e.button === 2) {
    const activeObject = canvas.getActiveObject();
    if (activeObject) showContextMenu(pointer.x, pointer.y);
    options.e.preventDefault();
  }
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ ДЛЯ НАЧАЛА РИСОВАНИЯ ЛИНИИ
function handleLineDrawingStart(options, pointer) {
  if (!lineStartPoint) {
    let snappedX, snappedY;
    let startPointFromObject = null;

    // Проверяем наличие объекта под курсором с зажатым Alt
    if (altKeyPressed && options.target) {
      const targetObject = options.target;
      const objectEdgePoint = findClosestPointOnObjectEdge(targetObject, pointer);
      if (objectEdgePoint) {
        startPointFromObject = {
          x: roundTo5(objectEdgePoint.x),
          y: roundTo5(objectEdgePoint.y),
          object: targetObject,
          edgePoint: true
        };
        snappedX = roundTo5(objectEdgePoint.x);
        snappedY = roundTo5(objectEdgePoint.y);
      }
    }

    if (!startPointFromObject) {
      snappedX = roundTo5(snapToGrid(pointer.x, APP_CONFIG.GRID_SIZE));
      snappedY = roundTo5(snapToGrid(pointer.y, APP_CONFIG.GRID_SIZE));
    }

    // ВАЖНО: Проверяем существующие узлы
    const nodeAtStartPoint = isPointInLockedNode(snappedX, snappedY);
    if (nodeAtStartPoint) {
      snappedX = nodeAtStartPoint.node.x;
      snappedY = nodeAtStartPoint.node.y;

      // Ищем объекты в этом узле для привязки
      const objectsAtNode = [];
      getCachedImages().forEach(img => {
        const center = getObjectCenter(img);
        const distance = Math.sqrt(
          Math.pow(center.x - snappedX, 2) +
          Math.pow(center.y - snappedY, 2)
        );
        if (distance < 30) {
          objectsAtNode.push(img);
        }
      });

      if (objectsAtNode.length > 0 && !startPointFromObject) {
        startPointFromObject = {
          x: snappedX,
          y: snappedY,
          object: objectsAtNode[0],
          edgePoint: true
        };
      }
    }

    // Если не в ручном режиме, проверяем линии для разделения
    if (!altKeyPressed && lineSplitMode !== 'MANUAL' && !nodeAtStartPoint) {
      const lineAtPoint = findLineAtPoint(pointer);
      if (lineAtPoint && !lineAtPoint.isEnd) {
        const splitResult = splitLineAtPoint(lineAtPoint.line, lineAtPoint.point);
        if (splitResult) {
          saveToUndoStack();

          canvas.remove(lineAtPoint.line);
          removeAirVolumeText(lineAtPoint.line);

          canvas.add(splitResult.line1);
          canvas.add(splitResult.line2);

          createOrUpdateAirVolumeText(splitResult.line1);
          createOrUpdateAirVolumeText(splitResult.line2);

          lineStartPoint = {
            x: lineAtPoint.point.x,
            y: lineAtPoint.point.y,
            lineSplit: true
          };

          previewLine = new fabric.Line([lineStartPoint.x, lineStartPoint.y, snappedX, snappedY], {
            stroke: APP_CONFIG.DEFAULT_LINE_COLOR,
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
            id: 'preview-line',
            isPreview: true
          });

          canvas.add(previewLine);

          setTimeout(() => {
            invalidateCache();
            updateConnectionGraph();
            updateAllAirVolumeTexts();
          }, 50);

          return;
        } else {
          lineStartPoint = {
            x: snappedX,
            y: snappedY,
            ...(startPointFromObject || {})
          };
        }
      } else if (lineAtPoint && lineAtPoint.isEnd) {
        lineStartPoint = {
          x: lineAtPoint.point.x,
          y: lineAtPoint.point.y,
          ...(startPointFromObject || {})
        };
      } else {
        lineStartPoint = {
          x: snappedX,
          y: snappedY,
          ...(startPointFromObject || {})
        };
      }
    } else {
      lineStartPoint = {
        x: snappedX,
        y: snappedY,
        ...(startPointFromObject || {})
      };
    }

    previewLine = new fabric.Line([lineStartPoint.x, lineStartPoint.y, snappedX, snappedY], {
      stroke: APP_CONFIG.DEFAULT_LINE_COLOR,
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      id: 'preview-line',
      isPreview: true
    });

    canvas.add(previewLine);
  } else {
    handleLineDrawingEnd(options, pointer);
  }
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ ДЛЯ ЗАВЕРШЕНИЯ РИСОВАНИЯ ЛИНИИ
function handleLineDrawingEnd(options, pointer) {
  let snappedX, snappedY;
  let endPointFromObject = null;

  if (altKeyPressed && options.target) {
    const targetObject = options.target;
    const objectEdgePoint = findClosestPointOnObjectEdge(targetObject, pointer);
    if (objectEdgePoint) {
      endPointFromObject = {
        x: roundTo5(objectEdgePoint.x),
        y: roundTo5(objectEdgePoint.y),
        object: targetObject,
        edgePoint: true
      };
      snappedX = roundTo5(objectEdgePoint.x);
      snappedY = roundTo5(objectEdgePoint.y);
    }
  }

  if (!endPointFromObject) {
    snappedX = roundTo5(snapToGrid(pointer.x, APP_CONFIG.GRID_SIZE));
    snappedY = roundTo5(snapToGrid(pointer.y, APP_CONFIG.GRID_SIZE));
  }

  // ВАЖНО: Проверяем, не попадает ли конечная точка на существующий узел
  const nodeAtEndPoint = isPointInLockedNode(snappedX, snappedY);
  if (nodeAtEndPoint) {
    // Используем координаты существующего узла
    snappedX = nodeAtEndPoint.node.x;
    snappedY = nodeAtEndPoint.node.y;
    console.log('Конечная точка привязана к существующему узлу');
  }

  // Проверяем, не попадает ли конечная точка на существующую линию (для разделения)
  if (!altKeyPressed && !nodeAtEndPoint) {
    const lineAtEndPoint = findLineAtPoint({x: snappedX, y: snappedY});
    if (lineAtEndPoint && !lineAtEndPoint.isEnd) {
      const splitResult = splitLineAtPoint(lineAtEndPoint.line, lineAtEndPoint.point);
      if (splitResult) {
        saveToUndoStack();

        canvas.remove(lineAtEndPoint.line);
        removeAirVolumeText(lineAtEndPoint.line);

        canvas.add(splitResult.line1);
        canvas.add(splitResult.line2);

        createOrUpdateAirVolumeText(splitResult.line1);
        createOrUpdateAirVolumeText(splitResult.line2);

        // Обновляем координаты для новой линии
        snappedX = lineAtEndPoint.point.x;
        snappedY = lineAtEndPoint.point.y;
      }
    }
  }

  // Создаем новую линию
  const length = roundTo5(Math.sqrt(Math.pow(snappedX - lineStartPoint.x, 2) + Math.pow(snappedY - lineStartPoint.y, 2)));
  const lineId = generateLineId();

  const passageLength = roundTo5(parseFloat(document.getElementById('propertyPassageLength')?.value) || 0.5);
  const roughnessCoefficient = roundTo5(parseFloat(document.getElementById('propertyRoughnessCoefficient')?.value) || 0.015);
  const crossSectionalArea = roundTo5(parseFloat(document.getElementById('propertyCrossSectionalArea')?.value) || 10);
  const perimeter = calculateLinePerimeter(crossSectionalArea);
  const airResistance = calculateAirResistance(roughnessCoefficient, perimeter, passageLength, crossSectionalArea);

  let initialAirVolume = 0;
  if (lineStartPoint.object && lineStartPoint.object.properties &&
    lineStartPoint.object.properties.airVolume !== undefined) {
    initialAirVolume = roundTo5(lineStartPoint.object.properties.airVolume);
  }

  const finalLine = new fabric.Line([lineStartPoint.x, lineStartPoint.y, snappedX, snappedY], {
    stroke: APP_CONFIG.DEFAULT_LINE_COLOR,
    strokeWidth: APP_CONFIG.DEFAULT_LINE_WIDTH,
    fill: false,
    strokeLineCap: 'round',
    hasControls: true,
    hasBorders: true,
    lockRotation: false,
    id: lineId,
    properties: {
      name: `Линия ${getCachedLines().length + 1}`,
      passageLength: passageLength,
      roughnessCoefficient: roughnessCoefficient,
      crossSectionalArea: crossSectionalArea,
      airResistance: airResistance,
      airVolume: initialAirVolume,
      perimeter: perimeter,
      length: length,
      startPoint: {x: lineStartPoint.x, y: lineStartPoint.y},
      endPoint: {x: snappedX, y: snappedY}
    }
  });

  if (lineStartPoint.object) {
    finalLine.lineStartsFromObject = true;
    finalLine.startObject = lineStartPoint.object;
    finalLine.properties.startsFromObject = {
      objectId: lineStartPoint.object.id || lineStartPoint.object._id,
      objectType: lineStartPoint.object.type,
      objectName: lineStartPoint.object.properties?.name || 'Объект',
      edgePoint: lineStartPoint.edgePoint || false
    };
    setTimeout(() => createIntersectionPointForLineStart(finalLine), 10);
  }

  if (previewLine) {
    canvas.remove(previewLine);
    previewLine = null;
  }

  canvas.add(finalLine);
  canvas.setActiveObject(finalLine);

  calculateAllLineProperties(finalLine);

  // НЕМЕДЛЕННО обновляем граф и тексты
  invalidateCache();
  buildConnectionGraph(); // Синхронное обновление графа
  updateAllAirVolumeTexts();

  scheduleRender();
  updatePropertiesPanel();
  updateStatus();

  if (!isContinuousLineMode) {
    deactivateAllModes();
  } else {
    // В непрерывном режиме: новая начальная точка = текущая конечная точка
    lineStartPoint = {
      x: snappedX,
      y: snappedY
    };

    // Проверяем, не привязана ли новая начальная точка к объекту
    if (options.target && altKeyPressed) {
      lineStartPoint.object = options.target;
      lineStartPoint.edgePoint = true;
    } else {
      // Проверяем, не находится ли точка в узле
      const nodeAtStart = isPointInLockedNode(snappedX, snappedY);
      if (nodeAtStart) {
        // Ищем объекты в этом узле
        const objectsAtNode = [];
        getCachedImages().forEach(img => {
          const center = getObjectCenter(img);
          const distance = Math.sqrt(
            Math.pow(center.x - snappedX, 2) +
            Math.pow(center.y - snappedY, 2)
          );
          if (distance < 30) {
            objectsAtNode.push(img);
          }
        });

        if (objectsAtNode.length > 0) {
          lineStartPoint.object = objectsAtNode[0];
          lineStartPoint.edgePoint = true;
        }
      }
    }

    // Создаем новый превью для следующего сегмента
    previewLine = new fabric.Line([lineStartPoint.x, lineStartPoint.y, snappedX, snappedY], {
      stroke: APP_CONFIG.DEFAULT_LINE_COLOR,
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      id: 'preview-line',
      isPreview: true
    });
    canvas.add(previewLine);

    // Дополнительная проверка баланса для отладки
    setTimeout(() => {
      const lines = getCachedLines();
      const lastLine = lines[lines.length - 1];
      if (lastLine && lastLine.properties) {
        console.log(`Создана линия ${lastLine.id} с объемом ${lastLine.properties.airVolume}`);
      }
    }, 50);
  }
}

function handleCanvasMouseMove(options) {
  if (!isDrawingLine || !lineStartPoint) return;

  const pointer = canvas.getPointer(options.e);
  const snappedX = roundTo5(snapToGrid(pointer.x, APP_CONFIG.GRID_SIZE));
  const snappedY = roundTo5(snapToGrid(pointer.y, APP_CONFIG.GRID_SIZE));

  const previewLine = canvas.getObjects().find(obj => obj.id === 'preview-line');
  if (previewLine) {
    previewLine.set({x2: snappedX, y2: snappedY});
    previewLine.setCoords();
  } else if (lineStartPoint) {
    const newPreviewLine = new fabric.Line([lineStartPoint.x, lineStartPoint.y, snappedX, snappedY], {
      stroke: APP_CONFIG.DEFAULT_LINE_COLOR,
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      id: 'preview-line',
      isPreview: true
    });
    canvas.add(newPreviewLine);
  }

  requestAnimationFrame(() => {
    canvas.requestRenderAll();
  });
}

function handleCanvasMouseOut() {
  if (altKeyPressed && isDrawingLine) {
    canvas.forEachObject(obj => {
      if (obj.type !== 'line' && obj.id !== 'grid-group' && obj.id !== 'grid-line') {
        obj.set('stroke', null);
        obj.set('strokeWidth', 0);
      }
    });
    scheduleRender();
  }
}

function handleCanvasDoubleClick(options) {
  if (options.target) {
    canvas.setActiveObject(options.target);
    showObjectPropertiesModal();
  }
}

function handleObjectAdded(e) {
  if (e.target && e.target.id !== 'intersection-point' &&
    e.target.id !== 'intersection-point-label' &&
    e.target.id !== 'air-volume-text') {

    invalidateCache();

    setTimeout(() => {
      bringIntersectionPointsToFront();
      updateAllAirVolumeTexts();
    }, 100);
  }
}

function handleObjectModified(e) {
  if (e.target && e.target.type === 'line') {
    if (e.target.properties) {
      calculateAllLineProperties(e.target);
    }
    createOrUpdateAirVolumeText(e.target);

    invalidateCache();

    setTimeout(() => {
      updateConnectionGraph();
    }, 100);
  }
}

function handleObjectRemoved(e) {
  if (e.target && e.target.type === 'line') {
    removeAirVolumeText(e.target);
  }

  invalidateCache();

  setTimeout(() => {
    updateConnectionGraph();
  }, 100);
}

// ==================== УПРАВЛЕНИЕ РЕЖИМАМИ ====================
function activateLineDrawing() {
  deactivateAllModes();
  cleanupPreviewLines();

  isDrawingLine = true;
  canvas.defaultCursor = 'crosshair';
  canvas.selection = false;
  canvas.forEachObject(obj => {
    if (obj.id !== 'grid-group' && obj.id !== 'grid-line') {
      obj.selectable = false;
    }
  });

  showNotification('Режим рисования линии. Кликните для начала, затем для конца. ESC для отмены.', 'info');
}

function cleanupPreviewLines() {
  const previewLines = canvas.getObjects().filter(obj => obj.id === 'preview-line');
  previewLines.forEach(line => {
    canvas.remove(line);
  });
}

function deactivateAllModes() {
  isDrawingLine = false;

  const previewLineObj = canvas.getObjects().find(obj => obj.id === 'preview-line');
  if (previewLineObj) {
    canvas.remove(previewLineObj);
  }

  previewLine = null;
  lineStartPoint = null;
  lastLineEndPoint = null;

  canvas.defaultCursor = 'default';
  canvas.selection = true;
  canvas.forEachObject(obj => {
    if (obj.id !== 'grid-group' && obj.id !== 'grid-line') {
      obj.selectable = true;
    }
  });

  updateStatus();
}

function toggleContinuousMode() {
  isContinuousLineMode = !isContinuousLineMode;
  const btn = document.getElementById('continuousModeBtn');
  if (isContinuousLineMode) {
    btn.innerHTML = '<span>🔗</span> Непрерывный (ВКЛ)';
    showNotification('Непрерывный режим включен', 'success');
  } else {
    btn.innerHTML = '<span>🔗</span> Непрерывный (ВЫКЛ)';
    showNotification('Непрерывный режим выключен', 'info');
  }
}

function toggleAutoSplitMode() {
  autoSplitMode = !autoSplitMode;
  const btn = document.getElementById('autoSplitBtn');
  if (autoSplitMode) {
    btn.innerHTML = '<span>⚡</span> Авторазбивка (ВКЛ)';
    showNotification('Автоматическое разделение линий включено', 'success');
  } else {
    btn.innerHTML = '<span>⚡</span> Авторазбивка (ВЫКЛ)';
    showNotification('Автоматическое разделение линий отключено', 'info');
  }
}

function toggleLineSplitMode() {
  if (lineSplitMode === 'AUTO') {
    lineSplitMode = 'MANUAL';
    document.getElementById('lineSplitModeBtn').innerHTML = '<span>🎯</span> Режим: РУЧНОЙ';
    showNotification('Режим разбиения: РУЧНОЙ', 'info');
  } else {
    lineSplitMode = 'AUTO';
    document.getElementById('lineSplitModeBtn').innerHTML = '<span>🎯</span> Режим: АВТО';
    showNotification('Режим разбиения: АВТО', 'info');
  }
}

// ==================== ИЗОБРАЖЕНИЯ ====================
function updateImageLibrary() {
  const grid = document.getElementById('imageLibraryGrid');
  if (!grid) return;
  grid.innerHTML = '';

  allImages.forEach(image => {
    const button = document.createElement('button');
    button.className = 'image-item';
    button.innerHTML = `<img src="${image.path}" alt="${image.name}" loading="lazy"><div class="image-item-name">${image.name}</div>`;
    button.onclick = () => activateImagePlacementMode(image);
    grid.appendChild(button);
  });
}

function activateImagePlacementMode(image) {
  deactivateAllModes();
  currentImageData = image;
  document.querySelectorAll('.image-item').forEach(btn => btn.classList.remove('active'));
  if (event && event.target) {
    event.target.closest('.image-item').classList.add('active');
  }
  canvas.defaultCursor = 'crosshair';
  canvas.selection = false;
  showNotification(`Режим добавления: ${image.name}. Кликните на холст для размещения.`, 'info');
}

function addImageAtPosition(x, y) {
  if (!currentImageData) {
    showNotification('Сначала выберите изображение!', 'error');
    return;
  }

  isDrawingImage = true;

  fabric.Image.fromURL(currentImageData.path, function (img) {
    const originalWidth = img.width || 100;
    const originalHeight = img.height || 100;
    const scale = roundTo5(Math.min(APP_CONFIG.MAX_IMAGE_SIZE / originalWidth,
      APP_CONFIG.MAX_IMAGE_SIZE / originalHeight, 1));

    const properties = {
      name: currentImageData.name,
      type: currentImageData.type || 'default',
      imageId: currentImageData.id,
      imagePath: currentImageData.path,
      width: roundTo5(originalWidth * scale),
      height: roundTo5(originalHeight * scale),
      airVolume: null,
      airResistance: null,
    };

    img.set({
      left: roundTo5(snapToGrid(x, APP_CONFIG.GRID_SIZE)),
      top: roundTo5(snapToGrid(y, APP_CONFIG.GRID_SIZE)),
      scaleX: scale,
      scaleY: scale,
      hasControls: true,
      hasBorders: true,
      lockUniScaling: false,
      selectable: true,
      originX: 'center',
      originY: 'center',
      properties: properties
    });

    saveToUndoStack();
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();

    if (autoSplitMode) {
      setTimeout(() => {
        splitLinesAtImagePosition(img);
        canvas.renderAll();
      }, 50);
    }

    updatePropertiesPanel();
    updateStatus();
    showNotification(`${currentImageData.name} добавлен`, 'success');

    setTimeout(() => {
      isDrawingImage = false;
    }, 100);

  }, {crossOrigin: 'anonymous'});
}

// ==================== ФУНКЦИИ ПЕРЕСЕЧЕНИЙ ====================
function findAllIntersections() {
  const startTime = performance.now();
  const lines = getCachedLines();
  const images = getCachedImages();
  const intersections = [];

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const intersection = lineIntersection(lines[i], lines[j]);
      if (intersection) {
        intersections.push(intersection);
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (let j = 0; j < images.length; j++) {
      const image = images[j];
      const center = getObjectCenter(image);
      const closestPoint = findClosestPointOnLine(center, line);

      if (closestPoint.param >= 0 && closestPoint.param <= 1) {
        const distanceToCenter = roundTo5(Math.sqrt(
          Math.pow(closestPoint.x - center.x, 2) + Math.pow(closestPoint.y - center.y, 2)
        ));

        const tolerance = roundTo5(Math.max(image.width * image.scaleX, image.height * image.scaleY) / 2);
        if (distanceToCenter <= tolerance) {
          intersections.push({
            x: roundTo5(closestPoint.x),
            y: roundTo5(closestPoint.y),
            line1: line,
            object: image,
            type: 'object-center',
            param: roundTo5(closestPoint.param),
            distance: distanceToCenter
          });
        }
      }
    }
  }

  const endTime = performance.now();
  performanceMetrics.lastIntersectionTime = endTime - startTime;

  return intersections;
}

function lineIntersection(line1, line2) {
  if (line1 === line2) return null;

  const x1 = line1.x1, y1 = line1.y1;
  const x2 = line1.x2, y2 = line1.y2;
  const x3 = line2.x1, y3 = line2.y1;
  const x4 = line2.x2, y4 = line2.y2;

  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denominator) < 0.000001) return null;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    const x = x1 + ua * (x2 - x1);
    const y = y1 + ua * (y2 - y1);
    return {
      x: roundTo5(x),
      y: roundTo5(y),
      ua: roundTo5(ua),
      ub: roundTo5(ub),
      line1: line1,
      line2: line2,
      type: 'line-line'
    };
  }
  return null;
}

function splitAllLines() {
  const startTime = performance.now();

  clearIntersectionPoints();
  const intersections = findAllIntersections();
  intersectionPoints = intersections;

  intersections.forEach((inter, index) => {
    createIntersectionPoint(inter.x, inter.y, index, inter);
  });

  const linesCopy = [...getCachedLines()];
  const linesToAdd = [];
  const linesToRemove = [];

  linesCopy.forEach(line => {
    const points = [];

    intersections.forEach(inter => {
      if (inter.line1 === line || inter.line2 === line) {
        const key = `${roundTo5(inter.x)}_${roundTo5(inter.y)}`;
        const distance = Math.sqrt(
          Math.pow(inter.x - line.x1, 2) +
          Math.pow(inter.y - line.y1, 2)
        );

        if (!points.some(p => p.key === key)) {
          points.push({
            x: inter.x,
            y: inter.y,
            key: key,
            distance: distance
          });
        }
      }
    });

    if (points.length > 0) {
      points.sort((a, b) => a.distance - b.distance);

      let currentStart = {x: line.x1, y: line.y1};
      let segments = [];

      for (const point of points) {
        const segmentLength = Math.sqrt(
          Math.pow(point.x - currentStart.x, 2) +
          Math.pow(point.y - currentStart.y, 2)
        );

        if (segmentLength > 5) {
          const proportion = segmentLength / line.properties?.length || 1;

          const segmentProps = JSON.parse(JSON.stringify(line.properties || {}));
          segmentProps.length = segmentLength;
          segmentProps.passageLength = roundTo5((line.properties?.passageLength || 0.5) * proportion);
          segmentProps.airVolume = roundTo5((line.properties?.airVolume || 0) * proportion);

          delete segmentProps.startsFromObject;

          const segmentId = generateLineId();
          const segment = new fabric.Line([currentStart.x, currentStart.y, point.x, point.y], {
            stroke: line.stroke,
            strokeWidth: line.strokeWidth,
            properties: segmentProps,
            id: segmentId
          });

          segments.push(segment);
          currentStart = {x: point.x, y: point.y};
        }
      }

      const lastSegmentLength = Math.sqrt(
        Math.pow(line.x2 - currentStart.x, 2) +
        Math.pow(line.y2 - currentStart.y, 2)
      );

      if (lastSegmentLength > 5) {
        const lastProportion = lastSegmentLength / line.properties?.length || 1;

        const lastSegmentProps = JSON.parse(JSON.stringify(line.properties || {}));
        lastSegmentProps.length = lastSegmentLength;
        lastSegmentProps.passageLength = roundTo5((line.properties?.passageLength || 0.5) * lastProportion);
        lastSegmentProps.airVolume = roundTo5((line.properties?.airVolume || 0) * lastProportion);

        delete lastSegmentProps.startsFromObject;

        const lastSegmentId = generateLineId();
        const lastSegment = new fabric.Line([currentStart.x, currentStart.y, line.x2, line.y2], {
          stroke: line.stroke,
          strokeWidth: line.strokeWidth,
          properties: lastSegmentProps,
          id: lastSegmentId
        });

        segments.push(lastSegment);
      }

      if (segments.length > 1) {
        linesToRemove.push(line);
        segments.forEach(segment => linesToAdd.push(segment));
      }
    }
  });

  if (linesToRemove.length > 0) {
    saveToUndoStack();

    linesToRemove.forEach(line => {
      canvas.remove(line);
      removeAirVolumeText(line);
    });

    linesToAdd.forEach(segment => {
      canvas.add(segment);
      createOrUpdateAirVolumeText(segment);
    });

    invalidateCache();

    setTimeout(() => {
      updateConnectionGraph();
      updateAllAirVolumeTexts();
    }, 100);

    scheduleRender();
    bringIntersectionPointsToFront();

    const endTime = performance.now();
    performanceMetrics.lastIntersectionTime = endTime - startTime;

    showNotification(`Разделено ${linesToRemove.length} линий на ${linesToAdd.length} сегментов за ${(endTime - startTime).toFixed(0)}ms`, 'success');
  } else {
    showNotification('Линий для разделения не найдено', 'info');
  }
}

function splitAllLinesAtObjectCenters() {
  const lines = getCachedLines();
  const images = getCachedImages();
  let splitCount = 0;

  lines.forEach(line => {
    const intersections = [];

    images.forEach(image => {
      const center = getObjectCenter(image);
      const closestPoint = findClosestPointOnLine(center, line);
      if (closestPoint.param >= 0 && closestPoint.param <= 1) {
        const tolerance = roundTo5(Math.max(image.width * image.scaleX, image.height * image.scaleY) / 2);
        const distanceToCenter = roundTo5(Math.sqrt(Math.pow(closestPoint.x - center.x, 2) + Math.pow(closestPoint.y - center.y, 2)));
        if (distanceToCenter <= tolerance) {
          intersections.push({
            point: closestPoint,
            image: image
          });
        }
      }
    });

    intersections.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.point.x - line.x1, 2) + Math.pow(a.point.y - line.y1, 2));
      const distB = Math.sqrt(Math.pow(b.point.x - line.x1, 2) + Math.pow(b.point.y - line.y1, 2));
      return distA - distB;
    });

    let currentLine = line;
    let lastEndPoint = {x: line.x1, y: line.y1};

    for (const inter of intersections) {
      const nodeCheck = isPointInLockedNode(inter.point.x, inter.point.y);
      if (nodeCheck && nodeCheck.node.locked) {
        continue;
      }

      const splitResult = splitLineAtPoint(currentLine, {
        x: roundTo5(inter.point.x),
        y: roundTo5(inter.point.y)
      });

      if (splitResult) {
        saveToUndoStack();
        canvas.remove(currentLine);
        removeAirVolumeText(currentLine);

        splitResult.line1.set({
          x1: lastEndPoint.x,
          y1: lastEndPoint.y,
          x2: inter.point.x,
          y2: inter.point.y
        });

        canvas.add(splitResult.line1);
        canvas.add(splitResult.line2);
        createOrUpdateAirVolumeText(splitResult.line1);
        createOrUpdateAirVolumeText(splitResult.line2);

        currentLine = splitResult.line2;
        lastEndPoint = {x: inter.point.x, y: inter.point.y};
        splitCount++;
      }
    }
  });

  setTimeout(() => {
    updateConnectionGraph();
    clearIntersectionPoints();
    const intersections = findAllIntersections();
    intersections.forEach((inter, idx) => createIntersectionPoint(inter.x, inter.y, idx, inter));
    bringIntersectionPointsToFront();
  }, 100);

  canvas.renderAll();

  if (splitCount > 0) {
    showNotification(`Разделено ${splitCount} линий по центрам объектов`, 'success');
  } else {
    showNotification('Линий для разделения по центрам объектов не найдено', 'info');
  }
}

function splitLinesAtImagePosition(image) {
  const lines = getCachedLines();
  let splitCount = 0;

  lines.forEach(line => {
    const center = getObjectCenter(image);
    const closestPoint = findClosestPointOnLine(center, line);
    if (closestPoint.param >= 0 && closestPoint.param <= 1) {
      const tolerance = roundTo5(Math.max(image.width * image.scaleX, image.height * image.scaleY) / 2);
      const distanceToCenter = roundTo5(Math.sqrt(Math.pow(closestPoint.x - center.x, 2) + Math.pow(closestPoint.y - center.y, 2)));
      if (distanceToCenter <= tolerance) {
        const nodeCheck = isPointInLockedNode(closestPoint.x, closestPoint.y);
        if (nodeCheck && nodeCheck.node.locked) {
          return;
        }

        const splitResult = splitLineAtPoint(line, {
          x: roundTo5(closestPoint.x),
          y: roundTo5(closestPoint.y)
        });
        if (splitResult) {
          saveToUndoStack();
          canvas.remove(line);
          removeAirVolumeText(line);
          canvas.add(splitResult.line1);
          canvas.add(splitResult.line2);
          createOrUpdateAirVolumeText(splitResult.line1);
          createOrUpdateAirVolumeText(splitResult.line2);
          splitCount++;
        }
      }
    }
  });

  setTimeout(() => {
    updateConnectionGraph();
    updateAllAirVolumeTexts();
  }, 100);

  canvas.renderAll();

  if (splitCount > 0) showNotification(`Разделено ${splitCount} линий по центру объектов`, 'success');
}

// ==================== ТОЧКИ ПЕРЕСЕЧЕНИЯ ====================
function createIntersectionPoint(x, y, index, intersectionData, customColor = '#ff4757') {
  const existingPoint = intersectionVisuals.find(v =>
    Math.abs(v.circle.left + 6 - x) < 0.1 &&
    Math.abs(v.circle.top + 6 - y) < 0.1
  );

  if (existingPoint) {
    return existingPoint.circle;
  }

  const circle = new fabric.Circle({
    left: roundTo5(x - 6),
    top: roundTo5(y - 6),
    radius: 6,
    fill: customColor,
    stroke: customColor,
    strokeWidth: 1,
    selectable: true,
    hasControls: false,
    hasBorders: false,
    evented: true,
    originX: 'center',
    originY: 'center',
    id: 'intersection-point',
    pointIndex: index,
    pointData: intersectionData,
    hoverCursor: 'pointer'
  });

  const text = new fabric.Text((index + 1).toString(), {
    left: roundTo5(x),
    top: roundTo5(y),
    fontSize: 10,
    fill: 'white',
    fontWeight: 'bold',
    selectable: false,
    evented: false,
    originX: 'center',
    originY: 'center',
    id: 'intersection-point-label'
  });

  circle.on('mousedown', function (e) {
    if (e.e.button === 0) {
      e.e.preventDefault();
      e.e.stopPropagation();

      const pointInfo = collectPointInfo(x, y);

      if (this.pointData) {
        if (this.pointData.type) pointInfo.type = this.pointData.type;
        if (this.pointData.line1) pointInfo.line1 = this.pointData.line1;
        if (this.pointData.line2) pointInfo.line2 = this.pointData.line2;
        if (this.pointData.object) pointInfo.object = this.pointData.object;
        if (this.pointData.edgePoint) pointInfo.edgePoint = this.pointData.edgePoint;
      }

      console.log('Открываем модальное окно для точки:', pointInfo);
      showIntersectionPointInfoModal(pointInfo);
      return false;
    }
  });

  canvas.add(circle);
  canvas.add(text);
  circle.bringToFront();
  text.bringToFront();
  intersectionVisuals.push({circle, text});

  return circle;
}

function collectPointInfo(x, y) {
  const lines = getCachedLines();
  const images = getCachedImages();

  const linesInPoint = [];
  const objectsInPoint = [];

  lines.forEach(line => {
    const closestPoint = findClosestPointOnLine({x, y}, line);

    if (closestPoint.distance < 10) {
      const distanceToStart = Math.sqrt(
        Math.pow(x - line.x1, 2) +
        Math.pow(y - line.y1, 2)
      );
      const distanceToEnd = Math.sqrt(
        Math.pow(x - line.x2, 2) +
        Math.pow(y - line.y2, 2)
      );

      const isStart = distanceToStart < 8;
      const isEnd = distanceToEnd < 8;

      linesInPoint.push({
        line: line,
        isStart: isStart,
        isEnd: isEnd,
        distance: closestPoint.distance,
        param: closestPoint.param,
        airVolume: line.properties?.airVolume || 0,
        airResistance: line.properties?.airResistance || 0,
        name: line.properties?.name || 'Линия'
      });
    }
  });

  images.forEach(image => {
    const center = getObjectCenter(image);
    const distance = Math.sqrt(
      Math.pow(x - center.x, 2) +
      Math.pow(y - center.y, 2)
    );

    const rect = getObjectRect(image);
    const isInside = x >= rect.left && x <= rect.right &&
      y >= rect.top && y <= rect.bottom;

    if (distance < 35 || isInside) {
      objectsInPoint.push({
        object: image,
        name: image.properties?.name || 'Объект',
        type: image.properties?.type || 'неизвестен',
        airVolume: image.properties?.airVolume || 0,
        airResistance: image.properties?.airResistance || 0,
        distance: distance,
        isInside: isInside
      });
    }
  });

  return {
    x: x,
    y: y,
    linesInPoint: linesInPoint,
    objectsInPoint: objectsInPoint,
    totalLines: linesInPoint.length,
    totalObjects: objectsInPoint.length,
    linesStarting: linesInPoint.filter(l => l.isStart).length,
    linesEnding: linesInPoint.filter(l => l.isEnd).length
  };
}

function createIntersectionPointModal() {
  const oldModal = document.getElementById('intersectionPointModal');
  if (oldModal) {
    oldModal.remove();
  }

  const modalHTML = `
    <div id="intersectionPointModal" class="modal">
      <div class="modal-content" style="max-width: 600px; max-height: 80vh;">
        <div class="modal-header">
          <h3>🔍 Информация о точке пересечения</h3>
          <button class="close-btn" onclick="closeIntersectionPointModal()">×</button>
        </div>
        <div id="intersectionPointInfoContent" class="modal-body" style="overflow-y: auto;">
          <div class="loading">
            <p>Загрузка информации о точке...</p>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeIntersectionPointModal()" class="btn btn-secondary">Закрыть</button>
          <button onclick="calculateAirVolumeAtPoint(${Date.now()})" class="btn btn-primary">Рассчитать воздух</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  if (!document.querySelector('#intersection-point-styles')) {
    const style = document.createElement('style');
    style.id = 'intersection-point-styles';
    style.textContent = `
      .point-info h4 {
        margin-top: 20px;
        margin-bottom: 10px;
        color: #4A00E0;
        border-bottom: 2px solid #eee;
        padding-bottom: 5px;
      }
      .point-info p {
        margin: 5px 0;
      }
      .lines-list, .objects-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .lines-list li, .objects-list li {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 5px;
        padding: 10px;
        margin-bottom: 10px;
      }
      .detail {
        color: #6c757d;
        font-size: 0.9em;
      }
      .point-summary {
        background: #e3f2fd;
        border-left: 4px solid #4A00E0;
        padding: 10px;
        margin: 10px 0;
        border-radius: 4px;
      }
      .point-coordinates {
        background: #f3e5f5;
        padding: 10px;
        border-radius: 4px;
        margin: 10px 0;
      }
      .no-data {
        color: #6c757d;
        font-style: italic;
        text-align: center;
        padding: 20px;
      }
      .loading {
        text-align: center;
        padding: 40px;
        color: #6c757d;
      }
    `;
    document.head.appendChild(style);
  }

  return document.getElementById('intersectionPointModal');
}

function showIntersectionPointInfoModal(pointData) {
  console.log('Данные точки:', pointData);

  let modal = document.getElementById('intersectionPointModal');
  let contentDiv = document.getElementById('intersectionPointInfoContent');

  if (!modal || !contentDiv) {
    console.log('Модальное окно не найдено, создаем...');
    modal = createIntersectionPointModal();
    contentDiv = document.getElementById('intersectionPointInfoContent');

    if (!modal || !contentDiv) {
      console.error('Не удалось создать модальное окно!');
      alert('Ошибка при создании модального окна. Пожалуйста, перезагрузите страницу.');
      return;
    }
  }

  if (!pointData || (!pointData.linesInPoint && !pointData.objectsInPoint)) {
    contentDiv.innerHTML = `
      <div class="point-info">
        <div class="no-data">
          <h4>⚠️ Нет данных</h4>
          <p>Не удалось собрать информацию о точке пересечения</p>
          <p>Координаты: ${pointData?.x || '?'}, ${pointData?.y || '?'}</p>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    return;
  }

  const {x, y} = pointData;

  let html = `
    <div class="point-info">
      <div class="point-summary">
        <h4>📊 Сводка по точке</h4>
        <p><strong>Всего линий:</strong> ${pointData.totalLines || 0}</p>
        <p><strong>Линий началом:</strong> ${pointData.linesStarting || 0}</p>
        <p><strong>Линий концом:</strong> ${pointData.linesEnding || 0}</p>
        <p><strong>Объектов в точке:</strong> ${pointData.totalObjects || 0}</p>
      </div>
      
      <div class="point-coordinates">
        <h4>📌 Координаты точки</h4>
        <p><strong>X:</strong> ${formatTo5(x || 0)}</p>
        <p><strong>Y:</strong> ${formatTo5(y || 0)}</p>
      </div>
  `;

  if (pointData.linesInPoint && pointData.linesInPoint.length > 0) {
    html += `
      <h4>📏 Линии в точке (${pointData.linesInPoint.length})</h4>
      <ul class="lines-list">
    `;

    pointData.linesInPoint.forEach((lineInfo, index) => {
      const line = lineInfo.line;
      const props = line.properties || {};
      const length = roundTo5(Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2)));

      html += `
        <li>
          <strong>${index + 1}. ${lineInfo.name || 'Линия без названия'}</strong><br>
          <span class="detail">${lineInfo.isStart ? '✅ НАЧАЛО линии' : lineInfo.isEnd ? '⭕ КОНЕЦ линии' : '📍 НА ЛИНИИ (параметр: ' + lineInfo.param.toFixed(2) + ')'}</span><br>
          <span class="detail">Длина: ${formatTo5(length)} px</span><br>
          <span class="detail">Объем воздуха: <strong>${formatTo5(lineInfo.airVolume || 0)} м³/с</strong></span><br>
          <span class="detail">Сопротивление: ${formatTo5(lineInfo.airResistance || 0)}</span>
        </li>
      `;
    });

    html += '</ul>';
  } else {
    html += '<h4>📏 Линии в точке</h4><p class="no-data">Нет линий, проходящих через эту точку</p>';
  }

  if (pointData.objectsInPoint && pointData.objectsInPoint.length > 0) {
    html += `
      <h4>🏭 Объекты в точке (${pointData.objectsInPoint.length})</h4>
      <ul class="objects-list">
    `;

    pointData.objectsInPoint.forEach((objInfo, index) => {
      html += `
        <li>
          <strong>${index + 1}. ${objInfo.name || 'Объект без названия'}</strong><br>
          <span class="detail">Тип: ${objInfo.type || 'неизвестен'}</span><br>
          <span class="detail">Объем воздуха: <strong>${formatTo5(objInfo.airVolume || 0)} м³/с</strong></span><br>
          <span class="detail">Сопротивление: ${formatTo5(objInfo.airResistance || 0)}</span><br>
          <span class="detail">${objInfo.isInside ? '📍 Точка ВНУТРИ объекта' : '📍 Точка РЯДОМ с объектом'}</span>
        </li>
      `;
    });

    html += '</ul>';
  } else {
    html += '<h4>🏭 Объекты в точке</h4><p class="no-data">Нет объектов в этой точке</p>';
  }

  if (pointData.type) {
    html += `
      <h4>ℹ️ Тип пересечения</h4>
      <p>
    `;

    if (pointData.type === 'object-center') {
      html += 'Объект на линии (центр объекта)';
    } else if (pointData.type === 'object-edge') {
      html += 'Точка на краю объекта';
    } else if (pointData.line1 && pointData.line2) {
      html += 'Пересечение двух линий';
    } else {
      html += pointData.type || 'Неизвестный тип пересечения';
    }

    html += '</p>';
  }

  if (pointData.linesInPoint && pointData.linesInPoint.length > 0) {
    let totalIncoming = 0;
    let totalOutgoing = 0;

    pointData.linesInPoint.forEach(lineInfo => {
      if (lineInfo.isStart) {
        totalOutgoing += lineInfo.airVolume || 0;
      } else if (lineInfo.isEnd) {
        totalIncoming += lineInfo.airVolume || 0;
      }
    });

    const balance = roundTo5(totalIncoming - totalOutgoing);

    html += `
      <div class="point-summary">
        <h4>💨 Баланс воздуха в точке</h4>
        <p><strong>Входящий поток:</strong> ${formatTo5(totalIncoming)} м³/с</p>
        <p><strong>Исходящий поток:</strong> ${formatTo5(totalOutgoing)} м³/с</p>
        <p><strong>Баланс:</strong> <span style="color: ${balance === 0 ? 'green' : 'red'}">${formatTo5(balance)} м³/с</span></p>
        ${balance !== 0 ? '<p class="detail">⚠️ Баланс не сходится! Проверьте расчеты.</p>' : '<p class="detail">✅ Баланс сходится</p>'}
      </div>
    `;
  }

  html += '</div>';

  contentDiv.innerHTML = html;
  modal.style.display = 'flex';
}

function closeIntersectionPointModal() {
  const modal = document.getElementById('intersectionPointModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function initializeIntersectionPointModal() {
  createIntersectionPointModal();
  console.log('Модальное окно для точек пересечения инициализировано');
}

function createIntersectionPointForLineStart(line) {
  if (!line.lineStartsFromObject || !line.startObject) return;
  const startPoint = {x: line.x1, y: line.y1};
  const existingPoint = intersectionPoints.find(p =>
    roundTo5(Math.abs(p.x - startPoint.x)) < 0.00001 && roundTo5(Math.abs(p.y - startPoint.y)) < 0.00001
  );
  if (existingPoint) return;

  const interIndex = intersectionPoints.length;
  const interData = {
    x: roundTo5(startPoint.x),
    y: roundTo5(startPoint.y),
    line1: line,
    object: line.startObject,
    type: 'object-edge',
    objectCenter: getObjectCenter(line.startObject),
    edgePoint: true
  };

  intersectionPoints.push(interData);
  createIntersectionPoint(startPoint.x, startPoint.y, interIndex, interData, '#ff9500');
}

function bringIntersectionPointsToFront() {
  intersectionVisuals.forEach(visual => {
    if (visual.circle && visual.text) {
      visual.circle.bringToFront();
      visual.text.bringToFront();
    }
  });
  canvas.renderAll();
}

function clearIntersectionPoints() {
  const objects = canvas.getObjects();
  for (let i = objects.length - 1; i >= 0; i--) {
    if (objects[i].id === 'intersection-point' || objects[i].id === 'intersection-point-label') {
      canvas.remove(objects[i]);
    }
  }
  intersectionPoints = [];
  intersectionVisuals = [];
  canvas.renderAll();
}

function calculateAirVolumeAtPoint(timestamp) {
  const modal = document.getElementById('intersectionPointModal');
  if (!modal) return;

  const content = document.getElementById('intersectionPointInfoContent');
  if (!content) return;

  const pointInfoText = content.querySelector('.point-coordinates');
  if (!pointInfoText) return;

  const xMatch = pointInfoText.innerHTML.match(/X:[^0-9]*([0-9.]+)/);
  const yMatch = pointInfoText.innerHTML.match(/Y:[^0-9]*([0-9.]+)/);

  if (!xMatch || !yMatch) return;

  const x = parseFloat(xMatch[1]);
  const y = parseFloat(yMatch[1]);

  console.log(`Расчет воздуха в точке (${x}, ${y})`);

  const pointInfo = collectPointInfo(x, y);
  showIntersectionPointInfoModal(pointInfo);

  showNotification('Пересчет воздуха в точке выполнен', 'success');
}

// ==================== АНАЛИЗ ТОЧЕК ПЕРЕСЕЧЕНИЯ ====================
function analyzeIntersectionPoints() {
  console.log('=== НАЧАЛО АНАЛИЗА ТОЧЕК ПЕРЕСЕЧЕНИЯ ===');

  const lines = getCachedLines();
  const images = getCachedImages();

  const pointsMap = new Map();

  lines.forEach(line => {
    const startKey = `${roundTo5(line.x1)}_${roundTo5(line.y1)}`;
    const endKey = `${roundTo5(line.x2)}_${roundTo5(line.y2)}`;

    if (!pointsMap.has(startKey)) {
      pointsMap.set(startKey, {
        x: roundTo5(line.x1),
        y: roundTo5(line.y1),
        linesStarting: [],
        linesEnding: [],
        objects: []
      });
    }

    const startPoint = pointsMap.get(startKey);
    startPoint.linesStarting.push({
      line: line,
      airVolume: line.properties?.airVolume || 0,
      resistance: line.properties?.airResistance || 1
    });

    if (!pointsMap.has(endKey)) {
      pointsMap.set(endKey, {
        x: roundTo5(line.x2),
        y: roundTo5(line.y2),
        linesStarting: [],
        linesEnding: [],
        objects: []
      });
    }

    const endPoint = pointsMap.get(endKey);
    endPoint.linesEnding.push({
      line: line,
      airVolume: line.properties?.airVolume || 0,
      resistance: line.properties?.airResistance || 1
    });
  });

  images.forEach(image => {
    const center = getObjectCenter(image);
    let closestPointKey = null;
    let minDistance = Infinity;

    for (const [key, point] of pointsMap.entries()) {
      const distance = roundTo5(Math.sqrt(
        Math.pow(point.x - center.x, 2) +
        Math.pow(point.y - center.y, 2)
      ));

      if (distance < minDistance && distance < 30) {
        minDistance = distance;
        closestPointKey = key;
      }
    }

    if (closestPointKey) {
      const point = pointsMap.get(closestPointKey);
      point.objects.push({
        object: image,
        name: image.properties?.name || 'Объект',
        airVolume: image.properties?.airVolume || 0,
        airResistance: image.properties?.airResistance || 1
      });
    }
  });

  let processedCount = 0;
  for (const [key, point] of pointsMap.entries()) {
    console.log(`\n🔵 УЗЕЛ ${key}:`);
    console.log(`  Объектов: ${point.objects.length}`);
    console.log(`  Линий начинается: ${point.linesStarting.length}`);
    console.log(`  Линий заканчивается: ${point.linesEnding.length}`);

    let totalIncomingVolume = 0;
    point.linesEnding.forEach(lineInfo => {
      if (lineInfo.line.properties?.airVolume) {
        totalIncomingVolume += lineInfo.line.properties.airVolume;
      }
    });

    if (totalIncomingVolume > 0) {
      console.log(`  Суммарный входящий объем: ${totalIncomingVolume.toFixed(3)} м³/с`);

      let volumeForDistribution = totalIncomingVolume;

      if (point.objects.length > 0) {
        const obj = point.objects[0];
        if (obj.airResistance > 0) {
          volumeForDistribution = volumeForDistribution / obj.airResistance;
          console.log(`  СЛУЧАЙ 5/6: Учитываем сопротивление объекта ${obj.airResistance}`);
        }
      }

      if (point.linesEnding.length >= 2 && point.linesStarting.length === 1) {
        const outgoingLine = point.linesStarting[0].line;
        outgoingLine.properties.airVolume = roundTo5(volumeForDistribution);
        outgoingLine.set('properties', outgoingLine.properties);
        console.log(`  СЛУЧАЙ 7: Суммарный объем ${totalIncomingVolume.toFixed(3)} передан исходящей линии`);
        processedCount++;
      }
    }

    if (point.objects.length > 0 && point.linesStarting.length === 1) {
      const obj = point.objects[0];
      if (obj.airVolume > 0) {
        const lineInfo = point.linesStarting[0];

        let volumeToLine = obj.airVolume;
        if (obj.airResistance > 0) {
          volumeToLine = volumeToLine / obj.airResistance;
          console.log(`  СЛУЧАЙ 5: Объект с сопротивлением ${obj.airResistance}`);
        }

        lineInfo.line.properties.airVolume = roundTo5(volumeToLine);
        lineInfo.line.set('properties', lineInfo.line.properties);
        console.log(`  СЛУЧАЙ 1: Объект отдает весь объем ${volumeToLine} линии`);
        processedCount++;
      }
    }

    if (point.objects.length > 0 && point.linesStarting.length > 1) {
      const obj = point.objects[0];
      if (obj.airVolume > 0) {
        let totalConductivity = 0;

        let volumeAfterObject = obj.airVolume;
        if (obj.airResistance > 0) {
          volumeAfterObject = volumeAfterObject / obj.airResistance;
          console.log(`  СЛУЧАЙ 6: Объект с сопротивлением ${obj.airResistance}`);
        }

        point.linesStarting.forEach(lineInfo => {
          if (lineInfo.resistance > 0) {
            totalConductivity += 1 / lineInfo.resistance;
          }
        });

        if (totalConductivity > 0) {
          point.linesStarting.forEach(lineInfo => {
            if (lineInfo.resistance > 0) {
              const conductivity = 1 / lineInfo.resistance;
              const lineVolume = roundTo5(volumeAfterObject * (conductivity / totalConductivity));
              lineInfo.line.properties.airVolume = lineVolume;
              lineInfo.line.set('properties', lineInfo.line.properties);
              console.log(`  СЛУЧАЙ 2: Линия получает ${lineVolume}`);
            }
          });
          processedCount++;
        }
      }
    }

    if (point.linesEnding.length === 1 && point.linesStarting.length === 1) {
      const incomingLine = point.linesEnding[0].line;
      const outgoingLine = point.linesStarting[0].line;

      if (incomingLine.properties?.airVolume > 0) {
        let volumeToTransfer = incomingLine.properties.airVolume;

        if (point.objects.length > 0) {
          const obj = point.objects[0];
          if (obj.airResistance > 0) {
            volumeToTransfer = volumeToTransfer / obj.airResistance;
            console.log(`  СЛУЧАЙ 5 (в узле): Учитываем сопротивление объекта`);
          }
        }

        outgoingLine.properties.airVolume = roundTo5(volumeToTransfer);
        outgoingLine.set('properties', outgoingLine.properties);
        console.log(`  СЛУЧАЙ 3: Объем ${volumeToTransfer} передан`);
        processedCount++;
      }
    }

    if (point.linesEnding.length === 1 && point.linesStarting.length > 1) {
      const incomingLine = point.linesEnding[0].line;

      if (incomingLine.properties?.airVolume > 0) {
        let volumeToDistribute = incomingLine.properties.airVolume;

        if (point.objects.length > 0) {
          const obj = point.objects[0];
          if (obj.airResistance > 0) {
            volumeToDistribute = volumeToDistribute / obj.airResistance;
            console.log(`  СЛУЧАЙ 6 (в узле): Учитываем сопротивление объекта`);
          }
        }

        let totalConductivity = 0;
        point.linesStarting.forEach(lineInfo => {
          if (lineInfo.resistance > 0) {
            totalConductivity += 1 / lineInfo.resistance;
          }
        });

        if (totalConductivity > 0) {
          point.linesStarting.forEach(lineInfo => {
            if (lineInfo.resistance > 0) {
              const conductivity = 1 / lineInfo.resistance;
              const lineVolume = roundTo5(volumeToDistribute * (conductivity / totalConductivity));
              lineInfo.line.properties.airVolume = lineVolume;
              lineInfo.line.set('properties', lineInfo.line.properties);
              console.log(`  СЛУЧАЙ 4: Линия получает ${lineVolume}`);
            }
          });
          processedCount++;
        }
      }
    }
  }

  updateAllAirVolumeTexts();
  scheduleRender();
  updatePropertiesPanel();

  console.log(`\n=== АНАЛИЗ ЗАВЕРШЕН ===`);
  console.log(`Обработано узлов: ${processedCount}`);
  showNotification(`Анализ завершен! Обработано ${processedCount} узлов`, 'success');

  return processedCount;
}

function createTestScenario() {
  clearCanvas();

  const fan = {
    id: 'test-fan',
    name: 'Тестовый вентилятор',
    path: './img/fan.png',
    type: 'fan'
  };

  fabric.Image.fromURL(fan.path, function (img) {
    img.set({
      left: 100,
      top: 100,
      scaleX: 0.5,
      scaleY: 0.5,
      properties: {
        name: fan.name,
        type: fan.type,
        airVolume: 10,
        airResistance: 1
      }
    });
    canvas.add(img);

    const lines = [];

    const line1 = new fabric.Line([100, 100, 200, 100], {
      stroke: '#4A00E0',
      strokeWidth: 5,
      properties: {
        name: 'Линия 1',
        airResistance: 1,
        airVolume: 0
      },
      id: 'line_1'
    });
    canvas.add(line1);
    lines.push(line1);

    const line2 = new fabric.Line([200, 100, 200, 200], {
      stroke: '#4A00E0',
      strokeWidth: 5,
      properties: {
        name: 'Линия 2',
        airResistance: 2,
        airVolume: 0
      },
      id: 'line_2'
    });
    canvas.add(line2);
    lines.push(line2);

    const line3 = new fabric.Line([200, 100, 300, 100], {
      stroke: '#4A00E0',
      strokeWidth: 5,
      properties: {
        name: 'Линия 3',
        airResistance: 1,
        airVolume: 0
      },
      id: 'line_3'
    });
    canvas.add(line3);
    lines.push(line3);

    const line4 = new fabric.Line([200, 200, 300, 100], {
      stroke: '#4A00E0',
      strokeWidth: 5,
      properties: {
        name: 'Линия 4',
        airResistance: 3,
        airVolume: 0
      },
      id: 'line_4'
    });
    canvas.add(line4);
    lines.push(line4);

    line1.lineStartsFromObject = true;
    line1.startObject = img;

    setTimeout(() => {
      invalidateCache();
      updateConnectionGraph();
      showNotification('Тестовый сценарий создан. Нажмите "Расчет воздуха"', 'success');
    }, 100);
  });
}

// ==================== ПАНЕЛЬ СВОЙСТВ ====================
function updatePropertiesPanel() {
  const activeObj = canvas.getActiveObject();
  const propsContent = document.getElementById('properties-content');
  if (!activeObj) {
    propsContent.innerHTML = `<p style="color: #7f8c8d; font-style: italic; text-align: center; padding: 20px;">Выберите объект на чертеже</p>`;
    return;
  }

  let content = `<div class="property-group"><h4>📄 Основные свойства</h4>
    <div class="property-row"><div class="property-label">Тип:</div><div class="property-value"><strong>${activeObj.type}</strong></div></div>`;

  if (activeObj.type === 'line') {
    const length = roundTo5(Math.sqrt(Math.pow(activeObj.x2 - activeObj.x1, 2) + Math.pow(activeObj.y2 - activeObj.y1, 2)));
    content += `<div class="property-row"><div class="property-label">Длина:</div><div class="property-value">${formatTo5(length)}px</div></div>`;
    if (activeObj.properties) {
      normalizeLineProperties(activeObj);
      const props = activeObj.properties;
      content += `<div class="property-group"><h4>📊 Технические параметры</h4>
        <div class="property-row"><div class="property-label">Название:</div><div class="property-value">${props.name || 'Без названия'}</div></div>
        <div class="property-row"><div class="property-label">Воздушное сопротивление:</div><div class="property-value"><strong>${formatTo5(props.airResistance || 0)}</strong></div></div>
        <div class="property-row"><div class="property-label">Объем воздуха:</div><div class="property-value"><strong>${formatTo5(props.airVolume || 0)} м³/с</strong></div></div>`;
      if (activeObj.lineStartsFromObject && activeObj.startObject) {
        content += `<div class="property-row"><div class="property-label">Источник воздуха:</div><div class="property-value">${activeObj.startObject.properties?.name || 'Объект'}</div></div>`;
      }
      content += `</div>`;
    }
  } else if (activeObj.type === 'image') {
    const props = activeObj.properties || {};
    content += `<div class="property-row"><div class="property-label">Название:</div><div class="property-value">${props.name || 'Изображение'}</div></div>
      <div class="property-row"><div class="property-label">Тип:</div><div class="property-value">${props.type || 'default'}</div></div>`;
    if (props.airVolume !== undefined && props.airVolume !== null) {
      content += `<div class="property-row"><div class="property-label">Объем воздуха:</div><div class="property-value">${formatTo5(props.airVolume)} м³/с</div></div>`;
    }
    if (props.airResistance !== undefined && props.airResistance !== null) {
      content += `<div class="property-row"><div class="property-label">Сопротивление объекта:</div><div class="property-value">${formatTo5(props.airResistance)}</div></div>`;
    }
  }

  content += `</div>`;
  propsContent.innerHTML = content;
}

function updateStatus() {
  const objects = getCachedObjects();
  const count = objects.all.filter(obj => obj.id !== 'grid-group' && obj.id !== 'grid-line' && !obj.isPreview).length;
  let statusText = `<strong>Объектов:</strong> ${count}`;

  if (count > APP_CONFIG.MAX_OBJECTS * 0.7) {
    statusText += ` ⚠️ <strong>МНОГО ОБЪЕКТОВ</strong>`;
  }

  const activeObj = canvas.getActiveObject();
  if (activeObj) {
    statusText += ` | <strong>Выбран:</strong> ${activeObj.type}`;
    if (activeObj.type === 'line') {
      const length = Math.sqrt(Math.pow(activeObj.x2 - activeObj.x1, 2) + Math.pow(activeObj.y2 - activeObj.y1, 2));
      statusText += ` (${formatTo5(length)}px)`;
      if (activeObj.properties && activeObj.properties.airResistance !== undefined) {
        statusText += ` | <strong>R:</strong> ${formatTo5(activeObj.properties.airResistance)}`;
      }
      if (activeObj.properties && activeObj.properties.airVolume !== undefined) {
        statusText += ` | <strong>Q:</strong> ${formatTo5(activeObj.properties.airVolume)} м³/с`;
      }
    }
  }

  if (isCalculatingAirVolumes) {
    statusText += ' | 🔄 <strong>Идет расчет воздуха...</strong>';
  }

  if (lineSplitMode === 'MANUAL') statusText += ' | 🎯 <strong>Ручной режим</strong>';
  if (altKeyPressed) statusText += ' | <strong>Alt: Привязка к объектам</strong>';
  if (nodeLockEnabled) statusText += ' | 🔒 <strong>Узлы заблокированы</strong>';
  document.getElementById('status').innerHTML = statusText;
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================
function initializeModals() {
  document.getElementById('linePropertiesForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    applyLineProperties();
  });
  document.getElementById('addImageForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    addNewImage();
  });
  document.getElementById('objectPropertiesForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    applyObjectProperties();
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        if (modal.id === 'linePropertiesModal') closeLinePropertiesModal();
        else if (modal.id === 'addImageModal') closeAddImageModal();
        else if (modal.id === 'objectPropertiesModal') closeObjectPropertiesModal();
        else if (modal.id === 'intersectionPointModal') closeIntersectionPointModal();
        else if (modal.id === 'airVolumeReportModal') closeAirVolumeReport();
      }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (isDrawingLine) {
        deactivateAllModes();
        cleanupPreviewLines();
        canvas.renderAll();
        showNotification('Режим рисования отменен', 'info');
      }

      closeLinePropertiesModal();
      closeAddImageModal();
      closeObjectPropertiesModal();
      closeIntersectionPointModal();
      closeAirVolumeReport();
    }
  });
}

function showLinePropertiesModal() {
  const activeObject = canvas.getActiveObject();
  if (!activeObject || activeObject.type !== 'line') {
    showNotification('Пожалуйста, выберите линию для редактирования!', 'error');
    return;
  }

  currentEditingLine = activeObject;
  normalizeLineProperties(activeObject);
  const props = activeObject.properties || {};
  document.getElementById('propertyName').value = props.name || '';
  document.getElementById('propertyColor').value = activeObject.stroke || APP_CONFIG.DEFAULT_LINE_COLOR;
  document.getElementById('propertyWidth').value = activeObject.strokeWidth || APP_CONFIG.DEFAULT_LINE_WIDTH;
  document.getElementById('propertyPassageLength').value = formatTo5(props.passageLength || 0.5);
  document.getElementById('propertyRoughnessCoefficient').value = formatTo5(props.roughnessCoefficient || 0.015);
  document.getElementById('propertyCrossSectionalArea').value = formatTo5(props.crossSectionalArea || 10);
  document.getElementById('propertyW').value = formatTo5(props.W || 1.0);
  document.getElementById('propertyAirVolume').value = formatTo5(props.airVolume || 0);

  const airVolumeInput = document.getElementById('propertyAirVolume');
  if (activeObject.lineStartsFromObject && activeObject.startObject) {
    airVolumeInput.readOnly = true;
    airVolumeInput.title = "Значение берется из объекта, к которому привязана линия";
  } else {
    airVolumeInput.readOnly = false;
    airVolumeInput.title = "";
  }

  document.getElementById('linePropertiesModal').style.display = 'flex';
}

function closeLinePropertiesModal() {
  document.getElementById('linePropertiesModal').style.display = 'none';
  currentEditingLine = null;
}

function applyLineProperties() {
  if (!currentEditingLine) return;
  const passageLength = roundTo5(parseFloat(document.getElementById('propertyPassageLength').value));
  const roughnessCoefficient = roundTo5(parseFloat(document.getElementById('propertyRoughnessCoefficient').value));
  const crossSectionalArea = roundTo5(parseFloat(document.getElementById('propertyCrossSectionalArea').value));
  const perimeter = calculateLinePerimeter(crossSectionalArea);
  const airResistance = calculateAirResistance(roughnessCoefficient, perimeter, passageLength, crossSectionalArea);

  let airVolume = 0;
  const airVolumeInput = document.getElementById('propertyAirVolume');
  if (airVolumeInput) {
    if (currentEditingLine.lineStartsFromObject && currentEditingLine.startObject) {
      if (currentEditingLine.startObject.properties && currentEditingLine.startObject.properties.airVolume !== undefined) {
        airVolume = roundTo5(currentEditingLine.startObject.properties.airVolume);
        showNotification('Объем воздуха линии остается привязанным к объекту', 'info');
      } else airVolume = roundTo5(parseFloat(airVolumeInput.value) || 0);
    } else airVolume = roundTo5(parseFloat(airVolumeInput.value) || 0);
  }

  const newProperties = {
    name: document.getElementById('propertyName').value,
    passageLength: passageLength,
    roughnessCoefficient: roughnessCoefficient,
    crossSectionalArea: crossSectionalArea,
    W: roundTo5(parseFloat(document.getElementById('propertyW').value)),
    perimeter: perimeter,
    airResistance: airResistance,
    airVolume: airVolume
  };

  const oldProps = currentEditingLine.properties || {};
  if (oldProps.length) newProperties.length = roundTo5(oldProps.length);
  if (oldProps.startPoint) newProperties.startPoint = {
    x: roundTo5(oldProps.startPoint.x),
    y: roundTo5(oldProps.startPoint.y)
  };
  if (oldProps.endPoint) newProperties.endPoint = {
    x: roundTo5(oldProps.endPoint.x),
    y: roundTo5(oldProps.endPoint.y)
  };
  if (oldProps.startsFromObject) newProperties.startsFromObject = oldProps.startsFromObject;

  saveToUndoStack();
  currentEditingLine.set({
    stroke: document.getElementById('propertyColor').value,
    strokeWidth: parseInt(document.getElementById('propertyWidth').value),
    properties: newProperties
  });

  createOrUpdateAirVolumeText(currentEditingLine);
  canvas.renderAll();
  updatePropertiesPanel();
  closeLinePropertiesModal();
  showNotification('Свойства линии обновлены', 'success');
}

function showObjectPropertiesModal() {
  const activeObject = canvas.getActiveObject();
  if (!activeObject) {
    showNotification('Выберите объект для редактирования!', 'error');
    return;
  }

  currentEditingObject = activeObject;
  currentEditingObjectType = activeObject.type;
  const props = activeObject.properties || {};

  if (activeObject.type === 'image') {
    document.getElementById('objPropertyName').value = props.name || '';
    document.getElementById('objPropertyType').value = props.type || 'custom';
    document.getElementById('objPropertyX').value = roundTo5(activeObject.left);
    document.getElementById('objPropertyY').value = roundTo5(activeObject.top);
    document.getElementById('objPropertyWidth').value = roundTo5(activeObject.width * activeObject.scaleX);
    document.getElementById('objPropertyHeight').value = roundTo5(activeObject.height * activeObject.scaleY);
    document.getElementById('objAirVolume').value = roundTo5(props.airVolume || 0);
    document.getElementById('objAirResistance').value = roundTo5(props.airResistance || 0);
  } else if (activeObject.type === 'line') {
    showLinePropertiesModal();
    return;
  }

  document.getElementById('objectPropertiesModal').style.display = 'flex';
}

function closeObjectPropertiesModal() {
  document.getElementById('objectPropertiesModal').style.display = 'none';
  currentEditingObject = null;
  currentEditingObjectType = null;
}

function applyObjectProperties() {
  if (!currentEditingObject) return;
  try {
    saveToUndoStack();
    const newProperties = {
      name: document.getElementById('objPropertyName').value.trim(),
      type: document.getElementById('objPropertyType').value,
      airVolume: roundTo5(parseFloat(document.getElementById('objAirVolume').value) || 0),
      airResistance: roundTo5(parseFloat(document.getElementById('objAirResistance').value) || 0)
    };

    const oldProps = currentEditingObject.properties || {};
    if (oldProps.imageId) newProperties.imageId = oldProps.imageId;
    if (oldProps.imagePath) newProperties.imagePath = oldProps.imagePath;
    if (oldProps.width !== undefined) newProperties.width = roundTo5(oldProps.width);
    if (oldProps.height !== undefined) newProperties.height = roundTo5(oldProps.height);

    const updates = {
      properties: newProperties,
      left: roundTo5(parseFloat(document.getElementById('objPropertyX').value) || currentEditingObject.left),
      top: roundTo5(parseFloat(document.getElementById('objPropertyY').value) || currentEditingObject.top)
    };

    if (currentEditingObject.type === 'image') {
      const newWidth = roundTo5(parseFloat(document.getElementById('objPropertyWidth').value));
      const newHeight = roundTo5(parseFloat(document.getElementById('objPropertyHeight').value));
      if (newWidth && newHeight) {
        const originalWidth = currentEditingObject._element?.naturalWidth || currentEditingObject.width;
        const originalHeight = currentEditingObject._element?.naturalHeight || currentEditingObject.height;
        updates.scaleX = roundTo5(newWidth / originalWidth);
        updates.scaleY = roundTo5(newHeight / originalHeight);
      }
    }

    currentEditingObject.set(updates);
    canvas.renderAll();

    const lines = getCachedLines();
    lines.forEach(line => {
      if (line.lineStartsFromObject && line.startObject &&
        (line.startObject.id === currentEditingObject.id || line.startObject._id === currentEditingObject._id)) {
        createOrUpdateAirVolumeText(line);
      }
    });

    updatePropertiesPanel();
    closeObjectPropertiesModal();
    showNotification('Свойства объекта обновлены', 'success');
  } catch (error) {
    showNotification('Ошибка при сохранении: ' + error.message, 'error');
  }
}

function deleteCurrentObject() {
  if (!currentEditingObject || !confirm('Удалить этот объект?')) return;

  if (currentEditingObject.type === 'line') {
    const startKey = `${roundTo5(currentEditingObject.x1)}_${roundTo5(currentEditingObject.y1)}`;
    const endKey = `${roundTo5(currentEditingObject.x2)}_${roundTo5(currentEditingObject.y2)}`;

    const startNode = connectionNodes.get(startKey);
    const endNode = connectionNodes.get(endKey);

    if ((startNode && startNode.locked && startNode.lines.length > 1) ||
      (endNode && endNode.locked && endNode.lines.length > 1)) {
      showNotification('Нельзя удалить линию из заблокированного узла!', 'error');
      return;
    }
  }

  saveToUndoStack();
  if (currentEditingObject.type === 'line') removeAirVolumeText(currentEditingObject);
  canvas.remove(currentEditingObject);
  canvas.renderAll();
  closeObjectPropertiesModal();
  updatePropertiesPanel();
  updateStatus();
  showNotification('Объект удален', 'info');
}

function showAddImageModal() {
  document.getElementById('addImageModal').style.display = 'flex';
  document.getElementById('addImageForm').reset();
}

function closeAddImageModal() {
  document.getElementById('addImageModal').style.display = 'none';
}

function addNewImage() {
  const name = document.getElementById('newImageName').value.trim();
  const type = document.getElementById('newImageType').value;
  const url = document.getElementById('newImageUrl').value.trim();

  if (!name) {
    showNotification('Введите название изображения!', 'error');
    return;
  }
  if (!url) {
    showNotification('Введите URL изображения!', 'error');
    return;
  }

  const newImage = {
    id: 'custom_' + Date.now(),
    name: name,
    path: url,
    type: type
  };
  allImages.push(newImage);
  updateImageLibrary();
  closeAddImageModal();
  showNotification(`Изображение "${name}" добавлено!`, 'success');
}

// ==================== УПРАВЛЕНИЕ ПРОЕКТОМ ====================
function saveDrawing() {
  const json = JSON.stringify(canvas.toJSON(['id', 'properties', 'pointIndex', 'pointData', 'lineStartsFromObject', 'startObject', 'airVolumeText', 'isPreview']));
  localStorage.setItem('fabricDrawing', json);

  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `чертеж-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const count = canvas.getObjects().filter(obj => obj.id !== 'grid-group' && obj.id !== 'grid-line' && !obj.isPreview).length;
  showNotification(`Чертеж сохранен! (${count} объектов)`, 'success');
}

function loadDrawing() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const json = event.target.result;
        deactivateAllModes();
        canvas.clear();
        drawGrid(APP_CONFIG.GRID_SIZE);
        canvas.loadFromJSON(json, function () {
          canvas.getObjects().forEach(obj => {
            if (obj.lineStartsFromObject && obj.properties?.startsFromObject?.objectId) {
              const startObject = canvas.getObjects().find(o =>
                (o.id === obj.properties.startsFromObject.objectId || o._id === obj.properties.startsFromObject.objectId)
              );
              if (startObject) {
                obj.startObject = startObject;
              }
            }
            if (obj.type === 'line') normalizeLineProperties(obj);
          });

          setTimeout(() => {
            invalidateCache();
            updateConnectionGraph();
            updateAllAirVolumeTexts();
          }, 500);

          canvas.renderAll();

          updatePropertiesPanel();
          updateStatus();
          const count = canvas.getObjects().filter(obj => obj.id !== 'grid-group' && obj.id !== 'grid-line' && !obj.isPreview).length;
          showNotification(`Чертеж загружен! (${count} объектов)`, 'success');
        });
      } catch (error) {
        showNotification('Ошибка загрузки файла: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearCanvas() {
  if (!confirm('Удалить все объекты с чертежа?')) return;
  deactivateAllModes();
  lastLineEndPoint = null;
  clearIntersectionPoints();
  canvas.getObjects().forEach(obj => {
    if (obj.id !== 'grid-group' && obj.id !== 'grid-line') canvas.remove(obj);
  });

  connectionNodes.clear();
  invalidateCache();

  canvas.renderAll();
  updatePropertiesPanel();
  updateStatus();
  showNotification('Холст очищен', 'info');
}

// ==================== ОТМЕНА/ПОВТОР ====================
function saveToUndoStack() {
  const json = JSON.stringify(canvas.toJSON(['id', 'properties', 'isPreview']));
  undoStack.push(json);
  redoStack = [];
  if (undoStack.length > APP_CONFIG.MAX_UNDO_STEPS) undoStack.shift();
  updateUndoRedoButtons();
}

function undoAction() {
  if (undoStack.length < 2) return;
  const currentState = undoStack.pop();
  redoStack.push(currentState);
  const previousState = undoStack[undoStack.length - 1];
  canvas.loadFromJSON(previousState, function () {
    setTimeout(() => {
      invalidateCache();
      updateConnectionGraph();
      updateAllAirVolumeTexts();
    }, 100);

    canvas.renderAll();
    updatePropertiesPanel();
    updateStatus();
  });
  updateUndoRedoButtons();
  showNotification('Действие отменено', 'info');
}

function redoAction() {
  if (redoStack.length === 0) return;
  const nextState = redoStack.pop();
  undoStack.push(nextState);
  canvas.loadFromJSON(nextState, function () {
    setTimeout(() => {
      invalidateCache();
      updateConnectionGraph();
      updateAllAirVolumeTexts();
    }, 100);

    canvas.renderAll();
    updatePropertiesPanel();
    updateStatus();
  });
  updateUndoRedoButtons();
  showNotification('Действие возвращено', 'info');
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn) undoBtn.disabled = undoStack.length < 2;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

// ==================== ГОРЯЧИЕ КЛАВИШИ ====================
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (isDrawingLine) {
        deactivateAllModes();
        cleanupPreviewLines();
        canvas.renderAll();
        showNotification('Режим рисования отменен', 'info');
      }

      closeLinePropertiesModal();
      closeAddImageModal();
      closeObjectPropertiesModal();
      closeIntersectionPointModal();
      closeAirVolumeReport();
    }

    if (event.key === 'Delete') {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        if (activeObject.type === 'line') {
          const startKey = `${roundTo5(activeObject.x1)}_${roundTo5(activeObject.y1)}`;
          const endKey = `${roundTo5(activeObject.x2)}_${roundTo5(activeObject.y2)}`;

          const startNode = connectionNodes.get(startKey);
          const endNode = connectionNodes.get(endKey);

          if ((startNode && startNode.locked && startNode.lines.length > 1) ||
            (endNode && endNode.locked && endNode.lines.length > 1)) {
            showNotification('Нельзя удалить линию из заблокированном узле!', 'error');
            return;
          }
        }

        saveToUndoStack();
        if (activeObject.type === 'line') removeAirVolumeText(activeObject);
        canvas.remove(activeObject);

        setTimeout(() => {
          invalidateCache();
          updateConnectionGraph();
        }, 100);

        canvas.renderAll();
        updatePropertiesPanel();
        updateStatus();
        showNotification('Объект удален', 'info');
      }
    }

    if (event.ctrlKey) {
      if (event.key === 's') {
        event.preventDefault();
        saveDrawing();
      }
      if (event.key === 'o') {
        event.preventDefault();
        loadDrawing();
      }
      if (event.key === 'z') {
        event.preventDefault();
        undoAction();
      }
      if (event.key === 'y') {
        event.preventDefault();
        redoAction();
      }
    }

    switch (event.key.toLowerCase()) {
      case 'l':
        event.preventDefault();
        activateLineDrawing();
        break;
      case 's':
        event.preventDefault();
        splitAllLines();
        break;
      case 'c':
        event.preventDefault();
        splitAllLinesAtObjectCenters();
        break;
      case 'g':
        event.preventDefault();
        toggleGrid();
        break;
      case 'a':
        event.preventDefault();
        toggleAutoSplitMode();
        break;
      case 'r':
        event.preventDefault();
        if (event.altKey) analyzeIntersectionPoints();
        break;
      case 't':
        event.preventDefault();
        if (event.altKey) updateAllAirVolumeTexts();
        break;
      case 'p':
        event.preventDefault();
        if (event.altKey) calculateAirVolumesForAllLines(true);
        break;
      case 'n':
        event.preventDefault();
        if (event.altKey) toggleNodeLock();
        break;
      case 'b':
        event.preventDefault();
        if (event.altKey) checkFlowBalance();
        break;
    }
  });
  document.addEventListener('click', hideContextMenu);
}

function setupAltKeyTracking() {
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Alt' || event.keyCode === 18) {
      altKeyPressed = true;
      if (isDrawingLine) {
        canvas.defaultCursor = 'crosshair';
        canvas.renderAll();
        showNotification('Alt нажата: режим привязки к краям объектов активирован', 'info', 1500);
      }
    }
  });

  document.addEventListener('keyup', function (event) {
    if (event.key === 'Alt' || event.keyCode === 18) {
      altKeyPressed = false;
      if (isDrawingLine) {
        canvas.defaultCursor = 'crosshair';
        canvas.renderAll();
      }
    }
  });
}

// ==================== КОНТЕКСТНОЕ МЕНЮ ====================
function showContextMenu(x, y) {
  const contextMenu = document.getElementById('contextMenu');
  const activeObject = canvas.getActiveObject();
  if (!activeObject) return;

  contextMenu.style.display = 'block';
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
  contextMenuVisible = true;

  const rect = contextMenu.getBoundingClientRect();
  if (x + rect.width > window.innerWidth) contextMenu.style.left = (x - rect.width) + 'px';
  if (y + rect.height > window.innerHeight) contextMenu.style.top = (y - rect.height) + 'px';
}

function hideContextMenu() {
  if (!contextMenuVisible) return;
  const contextMenu = document.getElementById('contextMenu');
  contextMenu.style.display = 'none';
  contextMenuVisible = false;
}

function deleteObject() {
  const activeObject = canvas.getActiveObject();
  if (!activeObject) return;

  if (activeObject.type === 'line') {
    const startKey = `${roundTo5(activeObject.x1)}_${roundTo5(activeObject.y1)}`;
    const endKey = `${roundTo5(activeObject.x2)}_${roundTo5(activeObject.y2)}`;

    const startNode = connectionNodes.get(startKey);
    const endNode = connectionNodes.get(endKey);

    if ((startNode && startNode.locked && startNode.lines.length > 1) ||
      (endNode && endNode.locked && endNode.lines.length > 1)) {
      showNotification('Нельзя удалить линию из заблокированного узла!', 'error');
      hideContextMenu();
      return;
    }
  }

  saveToUndoStack();
  if (activeObject.type === 'line') removeAirVolumeText(activeObject);
  canvas.remove(activeObject);

  setTimeout(() => {
    invalidateCache();
    updateConnectionGraph();
  }, 100);

  canvas.renderAll();
  updatePropertiesPanel();
  updateStatus();
  showNotification('Объект удален', 'info');
  hideContextMenu();
}

function duplicateObject() {
  const activeObject = canvas.getActiveObject();
  if (!activeObject) {
    showNotification('Выберите объект для дублирования', 'error');
    return;
  }
  saveToUndoStack();
  activeObject.clone(function (clone) {
    clone.left = roundTo5(clone.left + 20);
    clone.top = roundTo5(clone.top + 20);
    canvas.add(clone);
    canvas.setActiveObject(clone);

    setTimeout(() => {
      invalidateCache();
      updateConnectionGraph();
    }, 100);

    canvas.renderAll();
    showNotification('Объект дублирован', 'success');
  });
  hideContextMenu();
}

function bringObjectToFront() {
  const activeObject = canvas.getActiveObject();
  if (!activeObject) return;
  saveToUndoStack();
  activeObject.bringToFront();
  canvas.renderAll();
  showNotification('Объект перемещен на передний план', 'success');
  hideContextMenu();
}

function sendObjectToBack() {
  const activeObject = canvas.getActiveObject();
  if (!activeObject) return;
  saveToUndoStack();
  activeObject.sendToBack();
  canvas.renderAll();
  showNotification('Объект перемещен на задний план', 'success');
  hideContextMenu();
}

// ==================== УВЕДОМЛЕНИЯ ====================
function showNotification(message, type = 'info', duration = 3000) {
  const notification = document.getElementById('notification');
  if (!notification) return;

  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  notification.style.opacity = '1';

  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.style.display = 'none';
    }, 300);
  }, duration);
}

// ==================== ФУНКЦИИ ДЛЯ КНОПОК ====================
function exportLinePropertiesToCSV() {
  const lines = getCachedLines();

  if (lines.length === 0) {
    showNotification('Нет линий для экспорта!', 'error');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "ID,Название,Длина (px),Длина прохода (м),Коэф. шероховатости,Площадь сечения (м²),Периметр (м),Сопротивление (R),Объем воздуха (м³/с)\n";

  lines.forEach(line => {
    const props = line.properties || {};
    const length = roundTo5(Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2)));

    const row = [
      line.id || 'N/A',
      `"${props.name || 'Без названия'}"`,
      formatTo5(length),
      formatTo5(props.passageLength || 0),
      formatTo5(props.roughnessCoefficient || 0),
      formatTo5(props.crossSectionalArea || 0),
      formatTo5(props.perimeter || 0),
      formatTo5(props.airResistance || 0),
      formatTo5(props.airVolume || 0)
    ].join(',');

    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `линии_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showNotification(`Экспортировано ${lines.length} линий в CSV`, 'success');
}

function calculateAllPropertiesForAllLines() {
  const lines = getCachedLines();
  let updatedCount = 0;

  lines.forEach(line => {
    try {
      normalizeLineProperties(line);
      calculateAllLineProperties(line);
      updatedCount++;
    } catch (err) {
      console.warn('Ошибка при расчете свойств линии:', err, line);
    }
  });

  updateAllAirVolumeTexts();
  canvas.renderAll();
  updatePropertiesPanel();

  if (updatedCount > 0) {
    showNotification(`Пересчитаны свойства для ${updatedCount} линий`, 'success');
  } else {
    showNotification('Линии для пересчета не найдены', 'info');
  }
}

function showAirVolumeReport() {
  const lines = getCachedLines();
  const images = getCachedImages();

  if (lines.length === 0 && images.length === 0) {
    showNotification('Нет объектов для отчета!', 'error');
    return;
  }

  const modal = document.getElementById('airVolumeReportModal');
  if (!modal) {
    createAirVolumeReportModal();
  }

  let reportHTML = '<div class="report-content">';

  reportHTML += '<div class="report-summary">';
  reportHTML += `<h3>📊 Отчет по объемам воздуха</h3>`;
  reportHTML += `<p><strong>Всего линий:</strong> ${lines.length}</p>`;
  reportHTML += `<p><strong>Всего объектов:</strong> ${images.length}</p>`;

  let totalAirVolume = 0;
  lines.forEach(line => {
    if (line.properties?.airVolume) {
      totalAirVolume += line.properties.airVolume;
    }
  });

  reportHTML += `<p><strong>Суммарный объем воздуха:</strong> ${formatTo5(totalAirVolume)} м³/с</p>`;
  reportHTML += '</div>';

  if (lines.length > 0) {
    reportHTML += '<div class="report-section">';
    reportHTML += '<h4>📏 Линии</h4>';
    reportHTML += '<table class="report-table">';
    reportHTML += '<thead><tr><th>Название</th><th>Длина (px)</th><th>Сопротивление (R)</th><th>Объем воздуха (м³/с)</th></tr></thead>';
    reportHTML += '<tbody>';

    lines.forEach(line => {
      const props = line.properties || {};
      const length = roundTo5(Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2)));

      reportHTML += `<tr>
        <td>${props.name || 'Без названия'}</td>
        <td>${formatTo5(length)}</td>
        <td>${formatTo5(props.airResistance || 0)}</td>
        <td><strong>${formatTo5(props.airVolume || 0)}</strong></td>
      </tr>`;
    });

    reportHTML += '</tbody></table>';
    reportHTML += '</div>';
  }

  if (images.length > 0) {
    reportHTML += '<div class="report-section">';
    reportHTML += '<h4>🏭 Объекты</h4>';
    reportHTML += '<table class="report-table">';
    reportHTML += '<thead><tr><th>Название</th><th>Тип</th><th>Объем воздуха (м³/с)</th><th>Сопротивление</th></tr></thead>';
    reportHTML += '<tbody>';

    images.forEach(img => {
      const props = img.properties || {};
      reportHTML += `<tr>
        <td>${props.name || 'Объект'}</td>
        <td>${props.type || 'default'}</td>
        <td>${formatTo5(props.airVolume || 0)}</td>
        <td>${formatTo5(props.airResistance || 0)}</td>
      </tr>`;
    });

    reportHTML += '</tbody></table>';
    reportHTML += '</div>';
  }

  reportHTML += '</div>';

  const modalContent = document.getElementById('airVolumeReportContent');
  if (modalContent) {
    modalContent.innerHTML = reportHTML;
  }

  document.getElementById('airVolumeReportModal').style.display = 'flex';
}

function closeAirVolumeReport() {
  document.getElementById('airVolumeReportModal').style.display = 'none';
}

function createAirVolumeReportModal() {
  const modalHTML = `
    <div id="airVolumeReportModal" class="modal">
      <div class="modal-content" style="max-width: 800px; max-height: 80vh;">
        <div class="modal-header">
          <h3>📊 Отчет по объемам воздуха</h3>
          <button class="close-btn" onclick="closeAirVolumeReport()">×</button>
        </div>
        <div id="airVolumeReportContent" class="modal-body" style="overflow-y: auto;">
          <!-- Контент отчета будет здесь -->
        </div>
        <div class="modal-footer">
          <button onclick="exportAirVolumeReportToCSV()" class="btn btn-primary">
            <span>📥</span> Экспорт в CSV
          </button>
          <button onclick="closeAirVolumeReport()" class="btn btn-secondary">Закрыть</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function exportAirVolumeReportToCSV() {
  const lines = getCachedLines();
  const images = getCachedImages();

  let csvContent = "data:text/csv;charset=utf-8,";

  csvContent += "ОТЧЕТ ПО ОБЪЕМАМ ВОЗДУХА\n";
  csvContent += `Дата генерации: ${new Date().toLocaleString()}\n`;
  csvContent += `Всего линий: ${lines.length}\n`;
  csvContent += `Всего объектов: ${images.length}\n\n`;

  csvContent += "ЛИНИИ\n";
  csvContent += "Название,Длина (px),Длина прохода (м),Коэф. шероховатости,Площадь сечения (м²),Периметр (м),Сопротивление (R),Объем воздуха (м³/с),X1,Y1,X2,Y2\n";

  lines.forEach(line => {
    const props = line.properties || {};
    const length = roundTo5(Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2)));

    const row = [
      `"${props.name || 'Без названия'}"`,
      formatTo5(length),
      formatTo5(props.passageLength || 0),
      formatTo5(props.roughnessCoefficient || 0),
      formatTo5(props.crossSectionalArea || 0),
      formatTo5(props.perimeter || 0),
      formatTo5(props.airResistance || 0),
      formatTo5(props.airVolume || 0),
      formatTo5(line.x1),
      formatTo5(line.y1),
      formatTo5(line.x2),
      formatTo5(line.y2)
    ].join(',');

    csvContent += row + "\n";
  });

  csvContent += "\n\nОБЪЕКТЫ\n";
  csvContent += "Название,Тип,Объем воздуха (м³/с),Сопротивление,X,Y,Ширина,Высота\n";

  images.forEach(img => {
    const props = img.properties || {};
    const row = [
      `"${props.name || 'Объект'}"`,
      props.type || 'default',
      formatTo5(props.airVolume || 0),
      formatTo5(props.airResistance || 0),
      formatTo5(img.left || 0),
      formatTo5(img.top || 0),
      formatTo5(img.width * img.scaleX || 0),
      formatTo5(img.height * img.scaleY || 0)
    ].join(',');

    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `отчет_воздух_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showNotification('Отчет экспортирован в CSV', 'success');
}

// ==================== ЭКСПОРТ ГЛОБАЛЬНЫХ ФУНКЦИЙ ====================
window.canvas = canvas;
window.analyzeIntersectionPoints = analyzeIntersectionPoints;
window.calculateAirVolumesForAllLines = calculateAirVolumesForAllLines;
window.clearIntersectionPoints = clearIntersectionPoints;
window.updateConnectionGraph = updateConnectionGraph;
window.toggleNodeLock = toggleNodeLock;
window.exportLinePropertiesToCSV = exportLinePropertiesToCSV;
window.calculateAllPropertiesForAllLines = calculateAllPropertiesForAllLines;
window.showAirVolumeReport = showAirVolumeReport;
window.closeAirVolumeReport = closeAirVolumeReport;
window.exportAirVolumeReportToCSV = exportAirVolumeReportToCSV;
window.showIntersectionPointInfoModal = showIntersectionPointInfoModal;
window.closeIntersectionPointModal = closeIntersectionPointModal;
window.collectPointInfo = collectPointInfo;
window.invalidateCache = invalidateCache;
window.scheduleRender = scheduleRender;
window.calculateAirVolumeAtPoint = calculateAirVolumeAtPoint;
window.splitAllLines = splitAllLines;
window.generateLineId = generateLineId;
window.splitLineAtPoint = splitLineAtPoint;
window.checkFlowBalance = checkFlowBalance;
window.createTestScenarioComplex = createTestScenarioComplex;
window.splitAllLinesBeforeCalculation = splitAllLinesBeforeCalculation;

console.log('Редактор технических чертежей загружен с исправленным расчетом воздушных потоков для непрерывного режима!');