// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let canvas;
let isDrawingLine = false;
let isContinuousLineMode = false;
let lineStartPoint = null;
let previewLine = null;
let lastLineEndPoint = null;
const SNAP_RADIUS = 15;
let currentEditingLine = null;
let currentImageData = null;
let gridVisible = true;
let undoStack = [];
let redoStack = [];
let contextMenuVisible = false;
let autoSplitMode = true;
let lineSplitMode = 'AUTO';
let altKeyPressed = false;

// Переменные для точек разделения
let intersectionPoints = [];
let intersectionVisuals = [];

let currentEditingObject = null;
let currentEditingObjectType = null;

// Изображения
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
    id: 'fire2',
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
    id: 'sensor3',
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
    id: 'sensor3',
    name: 'Взрывные работы',
    icon: '📡',
    path: './img/vzrivnieraboti.png',
    type: 'sensor'
  },
  {
    id: 'sensor3',
    name: 'Массовые взрывные работы',
    icon: '📡',
    path: './img/massovievzivniepaboti.png',
    type: 'sensor'
  },
  {
    id: 'sensor3',
    name: 'Медпункт',
    icon: '📡',
    path: './img/medpunkt.png',
    type: 'sensor'
  },
  {
    id: 'sensor3',
    name: 'Надшахтное оборудование',
    icon: '📡',
    path: './img/nadshahtnoe.png',
    type: 'sensor'
  }
];

let allImages = [...defaultImages];

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function () {
  initializeCanvas();
  updateImageTools();
  updateStatus();
  console.log('Редактор технических чертежей загружен!');
});

function initializeCanvas() {
  canvas = new fabric.Canvas('fabric-canvas', {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true,
    selectionColor: 'rgba(74, 0, 224, 0.3)',
    selectionBorderColor: '#4A00E0',
    selectionLineWidth: 2
  });

  drawGrid(20);
  setupCanvasEvents();
  setupKeyboardShortcuts();
  setupAltKeyTracking();
  initializeModals();
}

// ==================== РЕЖИМЫ ====================
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

// ==================== СЕТКА ====================
function drawGrid(gridSize = 20) {
  const oldGrid = canvas.getObjects().filter(obj => obj.id === 'grid-group');
  oldGrid.forEach(obj => canvas.remove(obj));

  if (!gridVisible) return;

  const width = canvas.width, height = canvas.height;
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
}

function toggleGrid() {
  gridVisible = !gridVisible;
  const btn = document.getElementById('gridToggleBtn');

  if (gridVisible) {
    btn.innerHTML = '<span>🔲</span> Сетка (ВКЛ)';
    drawGrid(20);
    showNotification('Сетка включена', 'success');
  } else {
    btn.innerHTML = '<span>🔲</span> Сетка (ВЫКЛ)';
    drawGrid(20);
    showNotification('Сетка отключена', 'info');
  }
  canvas.renderAll();
}

// ==================== ИЗОБРАЖЕНИЯ ====================
function updateImageTools() {
  const grid = document.getElementById('imageToolsGrid');
  if (!grid) return;

  grid.innerHTML = '';

  allImages.forEach(image => {
    const button = document.createElement('button');
    button.className = 'image-item';
    button.innerHTML = `
      <div style="font-size: 24px;">
      <img src="${image.path}" alt="${image.name}">
      <div class="image-item-name">${image.name}</div>
    `;

    button.onclick = () => activateImagePlacementMode(image);
    grid.appendChild(button);
  });
}

function activateImagePlacementMode(image) {
  deactivateAllModes();
  currentImageData = image;

  document.querySelectorAll('.image-item').forEach(btn => btn.classList.remove('active-mode'));
  event.target.classList.add('active-mode');

  canvas.defaultCursor = 'crosshair';
  canvas.selection = false;

  showNotification(`Режим добавления: ${image.name}. Кликните на холст для размещения.`, 'info');
}

// ==================== РИСОВАНИЕ ЛИНИЙ ====================
function activateLineDrawing() {
  deactivateAllModes();
  isDrawingLine = true;
  canvas.defaultCursor = 'crosshair';
  canvas.selection = false;
  canvas.forEachObject(obj => obj.selectable = false);

  document.getElementById('lineDrawingBtn').classList.add('active-mode');

  const modeText = isContinuousLineMode
    ? 'Режим рисования линии (непрерывный). Кликните для начала, затем для конца.'
    : 'Режим рисования линии. Кликните для начала, затем для конца.';
  const altHint = ' Удерживайте Alt для привязки к краям объектов.';

  showNotification(modeText + altHint + ' ESC для отмены.', 'info');
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

// ==================== ОТСЛЕЖИВАНИЕ КЛАВИШИ ALT ====================
function setupAltKeyTracking() {
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Alt' || event.keyCode === 18) {
      altKeyPressed = true;
      if (isDrawingLine) {
        canvas.defaultCursor = 'crosshair';
        canvas.renderAll();
        showNotification('Alt нажата: режим привязки к краям объектов активирован', 'info', 1500);
      }
      updateStatus();
    }
  });

  document.addEventListener('keyup', function (event) {
    if (event.key === 'Alt' || event.keyCode === 18) {
      altKeyPressed = false;
      if (isDrawingLine) {
        canvas.defaultCursor = 'crosshair';
        canvas.renderAll();
      }
      updateStatus();
    }
  });
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function snapToGrid(value, gridSize = 20) {
  return Math.round(value / gridSize) * gridSize;
}

function deactivateAllModes() {
  if (isDrawingLine) {
    isDrawingLine = false;
    document.getElementById('lineDrawingBtn').classList.remove('active-mode');
    if (previewLine) {
      canvas.remove(previewLine);
      previewLine = null;
    }
    lineStartPoint = null;
    lastLineEndPoint = null;
  }

  if (currentImageData) {
    document.querySelectorAll('.image-item').forEach(btn => btn.classList.remove('active-mode'));
    currentImageData = null;
  }

  canvas.defaultCursor = 'default';
  canvas.selection = true;
  canvas.forEachObject(obj => {
    if (obj.id !== 'grid-group') {
      obj.selectable = true;
    }
  });

  updateStatus();
}

function updateStatus() {
  const count = canvas.getObjects().filter(obj =>
    obj.id !== 'grid-group' && obj.id !== 'grid-line'
  ).length;

  let statusText = `<strong>Объектов:</strong> ${count}`;

  const activeObj = canvas.getActiveObject();
  if (activeObj) {
    statusText += ` | <strong>Выбран:</strong> ${activeObj.type}`;
    if (activeObj.type === 'line') {
      const length = Math.sqrt(
        Math.pow(activeObj.x2 - activeObj.x1, 2) +
        Math.pow(activeObj.y2 - activeObj.y1, 2)
      );
      statusText += ` (${Math.round(length)}px)`;
    }
  }

  if (lineSplitMode === 'MANUAL') {
    statusText += ' | 🎯 <strong>Ручной режим</strong>';
  }

  if (altKeyPressed) {
    statusText += ' | <strong>Alt: Привязка к объектам</strong>';
  }

  document.getElementById('status').innerHTML = statusText;
}

function addImageAtPosition(x, y) {
  if (!currentImageData) {
    showNotification('Сначала выберите изображение!', 'error');
    return;
  }

  const MAX_SIZE = 40;

  fabric.Image.fromURL(currentImageData.path, function (img) {
    const originalWidth = img.width || 100;
    const originalHeight = img.height || 100;
    const scale = Math.min(MAX_SIZE / originalWidth, MAX_SIZE / originalHeight, 1);

    const properties = {
      name: currentImageData.name,
      type: currentImageData.type || 'default',
      imageId: currentImageData.id,
      imagePath: currentImageData.path,
      width: originalWidth * scale,
      height: originalHeight * scale
    };

    img.set({
      left: snapToGrid(x, 20),
      top: snapToGrid(y, 20),
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

    if (autoSplitMode) {
      setTimeout(() => {
        splitLinesAtImagePosition(img);
      }, 50);
    }

    updatePropertiesPanel();
    updateStatus();
    showNotification(`${currentImageData.name} добавлен`, 'success');

  }, {
    crossOrigin: 'anonymous'
  });
}

// ==================== ОБНОВЛЕНИЕ ПЕРЕСЕЧЕНИЙ ====================
function refreshAllIntersections() {
  clearIntersectionPoints();
  const intersections = findAllIntersections();
  intersectionPoints = intersections;

  intersections.forEach((inter, index) => {
    createIntersectionPoint(inter.x, inter.y, index, inter);
  });

  bringIntersectionPointsToFront();
  canvas.renderAll();

  if (intersections.length > 0) {
    showNotification(`Обновлено ${intersections.length} точек пересечения`, 'success');
  } else {
    showNotification('Пересечений не найдено', 'info');
  }
}

// ==================== ФУНКЦИИ РАБОТЫ С ОБЪЕКТАМИ ====================
function getObjectCenter(obj) {
  const width = obj.width * obj.scaleX;
  const height = obj.height * obj.scaleY;

  return {
    x: obj.left,
    y: obj.top,
    width: width,
    height: height
  };
}

function getObjectRect(obj) {
  const width = obj.width * obj.scaleX;
  const height = obj.height * obj.scaleY;

  return {
    left: obj.left - width / 2,
    right: obj.left + width / 2,
    top: obj.top - height / 2,
    bottom: obj.top + height / 2
  };
}

function findClosestPointOnObjectEdge(object, point) {
  if (!object || !point) return null;

  const objRect = getObjectRect(object);
  const center = getObjectCenter(object);

  if (object.type === 'image' || object.type === 'rect') {
    const left = objRect.left;
    const right = objRect.right;
    const top = objRect.top;
    const bottom = objRect.bottom;

    const isInside = point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;

    if (isInside) {
      const distToLeft = Math.abs(point.x - left);
      const distToRight = Math.abs(point.x - right);
      const distToTop = Math.abs(point.y - top);
      const distToBottom = Math.abs(point.y - bottom);

      const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

      if (minDist === distToLeft) {
        return {x: left, y: point.y};
      } else if (minDist === distToRight) {
        return {x: right, y: point.y};
      } else if (minDist === distToTop) {
        return {x: point.x, y: top};
      } else {
        return {x: point.x, y: bottom};
      }
    } else {
      let closestX = Math.max(left, Math.min(point.x, right));
      let closestY = Math.max(top, Math.min(point.y, bottom));

      const distToLeft = Math.abs(point.x - left);
      const distToRight = Math.abs(point.x - right);
      const distToTop = Math.abs(point.y - top);
      const distToBottom = Math.abs(point.y - bottom);

      const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

      if (minDist === distToLeft || minDist === distToRight) {
        closestY = point.y;
      } else {
        closestX = point.x;
      }

      closestX = Math.max(left, Math.min(closestX, right));
      closestY = Math.max(top, Math.min(closestY, bottom));

      return {x: closestX, y: closestY};
    }
  }

  if (object.type === 'circle') {
    const radius = object.radius * object.scaleX;
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return {x: center.x + radius, y: center.y};
    }

    const scale = radius / distance;
    return {
      x: center.x + dx * scale,
      y: center.y + dy * scale
    };
  }

  return {
    x: Math.max(objRect.left, Math.min(point.x, objRect.right)),
    y: Math.max(objRect.top, Math.min(point.y, objRect.bottom))
  };
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
function setupCanvasEvents() {
  canvas.on('mouse:down', function (options) {
    const pointer = canvas.getPointer(options.e);
    const gridSize = 20;

    if (options.e.shiftKey && currentImageData) {
      addImageAtPosition(pointer.x, pointer.y);
      return;
    }

    if (isDrawingLine) {
      let snappedX, snappedY;
      let startPointFromObject = null;

      if (altKeyPressed && options.target && options.target.type !== 'line') {
        const targetObject = options.target;
        const objectEdgePoint = findClosestPointOnObjectEdge(targetObject, pointer);

        if (objectEdgePoint) {
          startPointFromObject = {
            x: objectEdgePoint.x,
            y: objectEdgePoint.y,
            object: targetObject,
            edgePoint: true
          };

          snappedX = objectEdgePoint.x;
          snappedY = objectEdgePoint.y;

          showNotification(`Линия начинается от края объекта "${targetObject.properties?.name || targetObject.type}"`, 'info', 2000);
        }
      }

      if (isContinuousLineMode && lastLineEndPoint && !startPointFromObject) {
        const distanceToLastPoint = Math.sqrt(
          Math.pow(pointer.x - lastLineEndPoint.x, 2) +
          Math.pow(pointer.y - lastLineEndPoint.y, 2)
        );

        if (distanceToLastPoint < SNAP_RADIUS) {
          snappedX = lastLineEndPoint.x;
          snappedY = lastLineEndPoint.y;
        } else {
          snappedX = snapToGrid(pointer.x, gridSize);
          snappedY = snapToGrid(pointer.y, gridSize);
        }
      } else if (!startPointFromObject) {
        snappedX = snapToGrid(pointer.x, gridSize);
        snappedY = snapToGrid(pointer.y, gridSize);
      }

      if (!lineStartPoint) {
        lineStartPoint = {
          x: snappedX,
          y: snappedY,
          ...startPointFromObject
        };

        previewLine = new fabric.Line([
          lineStartPoint.x, lineStartPoint.y, snappedX, snappedY
        ], {
          stroke: '#4A00E0',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false
        });

        if (startPointFromObject) {
          previewLine.lineStartsFromObject = true;
          previewLine.startObject = startPointFromObject.object;
        }

        canvas.add(previewLine);
      } else {
        const length = Math.sqrt(
          Math.pow(snappedX - lineStartPoint.x, 2) +
          Math.pow(snappedY - lineStartPoint.y, 2)
        );

        const finalLine = new fabric.Line([
          lineStartPoint.x, lineStartPoint.y, snappedX, snappedY
        ], {
          stroke: document.getElementById('propertyColor')?.value || '#4A00E0',
          strokeWidth: parseInt(document.getElementById('propertyWidth')?.value || 2),
          fill: false,
          strokeLineCap: 'round',
          hasControls: true,
          hasBorders: true,
          lockRotation: false,
          properties: {
            name: document.getElementById('propertyName')?.value || `Линия`,
            L: parseFloat(document.getElementById('propertyL')?.value) || 0.5,
            I: parseFloat(document.getElementById('propertyI')?.value) || 0.015,
            K: parseFloat(document.getElementById('propertyK')?.value) || 10,
            W: parseFloat(document.getElementById('propertyW')?.value) || 1.0,
            length: length,
            startPoint: lineStartPoint,
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

          setTimeout(() => {
            createIntersectionPointForLineStart(finalLine);
          }, 10);
        }

        saveToUndoStack();
        canvas.add(finalLine);
        canvas.setActiveObject(finalLine);
        updatePropertiesPanel();

        lastLineEndPoint = {x: snappedX, y: snappedY};

        if (isContinuousLineMode) {
          lineStartPoint = {x: snappedX, y: snappedY};
          if (previewLine) {
            previewLine.set({
              x1: lineStartPoint.x,
              y1: lineStartPoint.y,
              x2: snappedX,
              y2: snappedY
            });
          }
        } else {
          deactivateAllModes();
        }
      }
      return;
    }

    if (options.e.button === 2) {
      const pointer = canvas.getPointer(options.e);
      const activeObject = canvas.getActiveObject();

      if (activeObject) {
        showContextMenu(pointer.x, pointer.y);
      }
      options.e.preventDefault();
    }
  });

  canvas.on('mouse:move', function (options) {
    const pointer = canvas.getPointer(options.e);

    if (isDrawingLine && lineStartPoint && previewLine) {
      const snappedX = snapToGrid(pointer.x, 20);
      const snappedY = snapToGrid(pointer.y, 20);
      previewLine.set({x2: snappedX, y2: snappedY});
      previewLine.setCoords();
      canvas.requestRenderAll();
    }
  });

  canvas.on('mouse:dblclick', function (options) {
    if (options.target) {
      canvas.setActiveObject(options.target);
      showObjectPropertiesModal();
    }
  });

  canvas.on('selection:created', updatePropertiesPanel);
  canvas.on('selection:updated', updatePropertiesPanel);
  canvas.on('selection:cleared', updatePropertiesPanel);

  canvas.on('object:added', function (e) {
    if (e.target && e.target.id !== 'intersection-point' && e.target.id !== 'intersection-point-label') {
      setTimeout(() => {
        bringIntersectionPointsToFront();
      }, 10);
    }
  });
}

function createIntersectionPointForLineStart(line) {
  if (!line.lineStartsFromObject || !line.startObject) return;

  const startPoint = {
    x: line.x1,
    y: line.y1
  };

  const existingPoint = intersectionPoints.find(p =>
    Math.abs(p.x - startPoint.x) < 5 && Math.abs(p.y - startPoint.y) < 5
  );

  if (existingPoint) return;

  const interIndex = intersectionPoints.length;
  const interData = {
    x: startPoint.x,
    y: startPoint.y,
    line1: line,
    object: line.startObject,
    type: 'object-edge',
    objectCenter: getObjectCenter(line.startObject),
    edgePoint: true
  };

  intersectionPoints.push(interData);

  createIntersectionPoint(startPoint.x, startPoint.y, interIndex, interData, '#ff9500');
}

// ==================== ГОРЯЧИЕ КЛАВИШИ ====================
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      deactivateAllModes();
      hideContextMenu();
    }

    if (event.key === 'Delete') {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        saveToUndoStack();
        canvas.remove(activeObject);
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
    }
  });

  document.addEventListener('click', hideContextMenu);
}

// ==================== ФУНКЦИИ РАЗДЕЛЕНИЯ ЛИНИЙ ====================
function splitAllLines() {
  clearIntersectionPoints();
  const intersections = findAllIntersections();
  intersectionPoints = intersections;

  intersections.forEach((inter, index) => {
    createIntersectionPoint(inter.x, inter.y, index, inter);
  });

  intersections.forEach((inter, index) => {
    if (inter.line1 && inter.line2) {
      splitLinesAtPoint(inter);
    } else if (inter.line1 && inter.object) {
      if (lineSplitMode !== 'MANUAL' || autoSplitMode) {
        const splitResult = splitLineAtPoint(inter.line1, {
          x: inter.x,
          y: inter.y
        });
        if (splitResult) {
          saveToUndoStack();
          canvas.remove(inter.line1);
          canvas.add(splitResult.line1);
          canvas.add(splitResult.line2);
        }
      }
    }
  });

  canvas.renderAll();
  bringIntersectionPointsToFront();

  if (intersections.length > 0) {
    showNotification(`Найдено ${intersections.length} точек пересечения`, 'success');
  } else {
    showNotification('Пересечений для разделения не найдено', 'info');
  }
}

function findAllIntersections() {
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  const images = canvas.getObjects().filter(obj => obj.type === 'image');
  const intersections = [];

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const intersection = lineIntersection(lines[i], lines[j]);
      if (intersection) {
        intersections.push(intersection);
      }
    }
  }

  lines.forEach(line => {
    images.forEach(image => {
      const center = getObjectCenter(image);
      const closestPoint = findClosestPointOnLine(center, line);

      if (closestPoint.param >= 0 && closestPoint.param <= 1) {
        const rect = getObjectRect(image);
        const tolerance = Math.max(image.width * image.scaleX, image.height * image.scaleY) / 2;

        const distanceToCenter = Math.sqrt(
          Math.pow(closestPoint.x - center.x, 2) +
          Math.pow(closestPoint.y - center.y, 2)
        );

        if (distanceToCenter <= tolerance) {
          intersections.push({
            x: closestPoint.x,
            y: closestPoint.y,
            line1: line,
            object: image,
            type: 'object-center',
            objectCenter: center,
            param: closestPoint.param
          });
        }
      }
    });
  });

  return intersections;
}

function findClosestPointOnLine(point, line) {
  const x1 = line.x1;
  const y1 = line.y1;
  const x2 = line.x2;
  const y2 = line.y2;

  const A = point.x - x1;
  const B = point.y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return {
    x: xx,
    y: yy,
    param: param
  };
}

function lineIntersection(line1, line2) {
  if (line1 === line2) return null;

  const x1 = line1.x1, y1 = line1.y1;
  const x2 = line1.x2, y2 = line1.y2;
  const x3 = line2.x1, y3 = line2.y1;
  const x4 = line2.x2, y4 = line2.y2;

  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  if (Math.abs(denominator) < 0.000001) {
    return null;
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    const x = x1 + ua * (x2 - x1);
    const y = y1 + ua * (y2 - y1);

    return {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      ua: ua,
      ub: ub,
      line1: line1,
      line2: line2
    };
  }

  return null;
}

function splitLinesAtPoint(intersection) {
  const results = [];

  if (intersection.line1) {
    const splitResult1 = splitLineAtPoint(intersection.line1, {
      x: intersection.x,
      y: intersection.y
    });
    if (splitResult1) {
      saveToUndoStack();
      canvas.remove(intersection.line1);
      canvas.add(splitResult1.line1);
      canvas.add(splitResult1.line2);
      results.push({
        original: intersection.line1,
        newLines: [splitResult1.line1, splitResult1.line2]
      });
    }
  }

  if (intersection.line2) {
    const splitResult2 = splitLineAtPoint(intersection.line2, {
      x: intersection.x,
      y: intersection.y
    });
    if (splitResult2) {
      saveToUndoStack();
      canvas.remove(intersection.line2);
      canvas.add(splitResult2.line1);
      canvas.add(splitResult2.line2);
      results.push({
        original: intersection.line2,
        newLines: [splitResult2.line1, splitResult2.line2]
      });
    }
  }

  return results;
}

function splitLineAtPoint(line, point) {
  const dx1 = point.x - line.x1;
  const dy1 = point.y - line.y1;
  const dx2 = point.x - line.x2;
  const dy2 = point.y - line.y2;

  const distance1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  if (distance1 < 0.1 || distance2 < 0.1) {
    return null;
  }

  const totalLength = Math.sqrt(
    Math.pow(line.x2 - line.x1, 2) +
    Math.pow(line.y2 - line.y1, 2)
  );

  if (distance1 < 1 || distance2 < 1) {
    return null;
  }

  const lineVector = {
    x: line.x2 - line.x1,
    y: line.y2 - line.y1
  };

  const pointVector = {
    x: point.x - line.x1,
    y: point.y - line.y1
  };

  const dotProduct = lineVector.x * pointVector.x + lineVector.y * pointVector.y;
  const lineLengthSquared = lineVector.x * lineVector.x + lineVector.y * lineVector.y;

  const t = dotProduct / lineLengthSquared;

  if (t < 0 || t > 1) {
    return null;
  }

  const line1 = new fabric.Line([
    line.x1, line.y1,
    point.x, point.y
  ], {
    stroke: line.stroke,
    strokeWidth: line.strokeWidth,
    strokeDashArray: line.strokeDashArray,
    fill: false,
    strokeLineCap: 'round',
    hasControls: true,
    hasBorders: true,
    lockRotation: false,
    properties: {...line.properties}
  });

  const line2 = new fabric.Line([
    point.x, point.y,
    line.x2, line.y2
  ], {
    stroke: line.stroke,
    strokeWidth: line.strokeWidth,
    strokeDashArray: line.strokeDashArray,
    fill: false,
    strokeLineCap: 'round',
    hasControls: true,
    hasBorders: true,
    lockRotation: false,
    properties: {...line.properties}
  });

  if (line1.properties) line1.properties.length = distance1;
  if (line2.properties) line2.properties.length = distance2;

  return {line1, line2};
}

function splitLinesAtImagePosition(image) {
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  let splitCount = 0;

  lines.forEach(line => {
    const center = getObjectCenter(image);
    const closestPoint = findClosestPointOnLine(center, line);

    if (closestPoint.param >= 0 && closestPoint.param <= 1) {
      const rect = getObjectRect(image);
      const tolerance = Math.max(image.width * image.scaleX, image.height * image.scaleY) / 2;

      const distanceToCenter = Math.sqrt(
        Math.pow(closestPoint.x - center.x, 2) +
        Math.pow(closestPoint.y - center.y, 2)
      );

      if (distanceToCenter <= tolerance) {
        const splitResult = splitLineAtPoint(line, {
          x: closestPoint.x,
          y: closestPoint.y
        });

        if (splitResult) {
          saveToUndoStack();
          canvas.remove(line);
          canvas.add(splitResult.line1);
          canvas.add(splitResult.line2);
          splitCount++;

          const interIndex = intersectionPoints.length;
          const interData = {
            x: closestPoint.x,
            y: closestPoint.y,
            line1: line,
            object: image,
            type: 'object-center',
            objectCenter: center
          };

          intersectionPoints.push(interData);

          if (lineSplitMode !== 'MANUAL' || autoSplitMode) {
            createIntersectionPoint(closestPoint.x, closestPoint.y, interIndex, interData);
            bringIntersectionPointsToFront();
          }
        }
      }
    }
  });

  if (splitCount > 0) {
    showNotification(`Разделено ${splitCount} линий по центру объектов`, 'success');
  }

  canvas.renderAll();
}

function splitAllLinesAtObjectCenters() {
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  const images = canvas.getObjects().filter(obj => obj.type === 'image');
  let splitCount = 0;

  lines.forEach(line => {
    images.forEach(image => {
      const center = getObjectCenter(image);
      const closestPoint = findClosestPointOnLine(center, line);

      if (closestPoint.param >= 0 && closestPoint.param <= 1) {
        const tolerance = Math.max(image.width * image.scaleX, image.height * image.scaleY) / 2;
        const distanceToCenter = Math.sqrt(
          Math.pow(closestPoint.x - center.x, 2) +
          Math.pow(closestPoint.y - center.y, 2)
        );

        if (distanceToCenter <= tolerance) {
          const splitResult = splitLineAtPoint(line, {
            x: closestPoint.x,
            y: closestPoint.y
          });

          if (splitResult) {
            saveToUndoStack();
            canvas.remove(line);
            canvas.add(splitResult.line1);
            canvas.add(splitResult.line2);
            splitCount++;
            return;
          }
        }
      }
    });
  });

  setTimeout(() => {
    clearIntersectionPoints();
    const intersections = findAllIntersections();
    intersectionPoints = intersections;
    intersections.forEach((inter, idx) => {
      createIntersectionPoint(inter.x, inter.y, idx, inter);
    });
    bringIntersectionPointsToFront();
  }, 50);

  if (splitCount > 0) {
    showNotification(`Разделено ${splitCount} линий по центрам объектов`, 'success');
  } else {
    showNotification('Линий для разделения по центрам объектов не найдено', 'info');
  }
}

// ==================== ТОЧКИ ПЕРЕСЕЧЕНИЯ ====================
function createIntersectionPoint(x, y, index, intersectionData, customColor = '#ff4757') {
  const circle = new fabric.Circle({
    left: x - 6,
    top: y - 6,
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
    left: x,
    top: y,
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
    if (e.button === 1) {
      showIntersectionPointInfo(index);
    }
  });

  canvas.add(circle);
  canvas.add(text);
  circle.bringToFront();
  text.bringToFront();

  intersectionVisuals.push({circle, text});

  return circle;
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
}

function bringIntersectionPointsToFront() {
  intersectionVisuals.forEach(visual => {
    if (visual.circle && visual.text) {
      visual.circle.bringToFront();
      visual.text.bringToFront();
    }
  });
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

  const opacitySlider = document.getElementById('objPropertyOpacity');
  const opacityValue = document.getElementById('opacityValue');

  if (opacitySlider && opacityValue) {
    opacitySlider.addEventListener('input', function (e) {
      opacityValue.textContent = e.target.value + '%';
    });
  }

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        if (modal.id === 'linePropertiesModal') {
          closeLinePropertiesModal();
        } else if (modal.id === 'addImageModal') {
          closeAddImageModal();
        } else if (modal.id === 'objectPropertiesModal') {
          closeObjectPropertiesModal();
        } else if (modal.id === 'intersectionPointModal') {
          closeIntersectionPointModal();
        }
      }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeLinePropertiesModal();
      closeAddImageModal();
      closeObjectPropertiesModal();
      closeIntersectionPointModal();
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
  const props = activeObject.properties || {};

  document.getElementById('propertyName').value = props.name || '';
  document.getElementById('propertyColor').value = activeObject.stroke || '#4A00E0';
  document.getElementById('propertyWidth').value = activeObject.strokeWidth || 2;
  document.getElementById('propertyL').value = props.L || 0.5;
  document.getElementById('propertyI').value = props.I || 0.015;
  document.getElementById('propertyK').value = props.K || 10;
  document.getElementById('propertyW').value = props.W || 1.0;

  document.getElementById('linePropertiesModal').style.display = 'flex';
}

function closeLinePropertiesModal() {
  document.getElementById('linePropertiesModal').style.display = 'none';
  currentEditingLine = null;
}

function applyLineProperties() {
  if (!currentEditingLine) return;

  const newProperties = {
    name: document.getElementById('propertyName').value,
    L: parseFloat(document.getElementById('propertyL').value),
    I: parseFloat(document.getElementById('propertyI').value),
    K: parseFloat(document.getElementById('propertyK').value),
    W: parseFloat(document.getElementById('propertyW').value)
  };

  const oldProps = currentEditingLine.properties || {};
  if (oldProps.length) newProperties.length = oldProps.length;
  if (oldProps.startPoint) newProperties.startPoint = oldProps.startPoint;
  if (oldProps.endPoint) newProperties.endPoint = oldProps.endPoint;
  if (oldProps.startsFromObject) newProperties.startsFromObject = oldProps.startsFromObject;

  saveToUndoStack();
  currentEditingLine.set({
    stroke: document.getElementById('propertyColor').value,
    strokeWidth: parseInt(document.getElementById('propertyWidth').value),
    properties: newProperties
  });

  canvas.renderAll();
  updatePropertiesPanel();
  closeLinePropertiesModal();
  showNotification('Свойства линии обновлены', 'success');
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
    icon: '🖼️',
    path: url,
    type: type
  };

  allImages.push(newImage);
  updateImageTools();
  closeAddImageModal();
  showNotification(`Изображение "${name}" добавлено!`, 'success');
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
    document.getElementById('objPropertyX').value = Math.round(activeObject.left);
    document.getElementById('objPropertyY').value = Math.round(activeObject.top);
    document.getElementById('objPropertyWidth').value = Math.round(activeObject.width * activeObject.scaleX);
    document.getElementById('objPropertyHeight').value = Math.round(activeObject.height * activeObject.scaleY);
    document.getElementById('objPropertyRotation').value = Math.round(activeObject.angle || 0);
    document.getElementById('objPropertyOpacity').value = Math.round((activeObject.opacity || 1) * 100);
    document.getElementById('opacityValue').textContent = Math.round((activeObject.opacity || 1) * 100) + '%';
    document.getElementById('objPropertyNotes').value = props.notes || '';
    document.getElementById('objPropertyCustomData').value = JSON.stringify(props.customData || {}, null, 2);

    document.querySelectorAll('.form-group').forEach(el => el.style.display = 'block');
  } else if (activeObject.type === 'line') {
    showLinePropertiesModal();
    return;
  } else {
    document.getElementById('objPropertyName').value = props.name || activeObject.type || '';
    document.getElementById('objPropertyType').value = props.type || 'custom';
    document.getElementById('objPropertyX').value = Math.round(activeObject.left);
    document.getElementById('objPropertyY').value = Math.round(activeObject.top);

    if (activeObject.width) {
      document.getElementById('objPropertyWidth').value = Math.round(activeObject.width * (activeObject.scaleX || 1));
      document.getElementById('objPropertyHeight').value = Math.round(activeObject.height * (activeObject.scaleY || 1));
    } else {
      document.getElementById('objPropertyWidth').parentElement.style.display = 'none';
      document.getElementById('objPropertyHeight').parentElement.style.display = 'none';
    }

    document.getElementById('objPropertyRotation').value = Math.round(activeObject.angle || 0);
    document.getElementById('objPropertyOpacity').value = Math.round((activeObject.opacity || 1) * 100);
    document.getElementById('opacityValue').textContent = Math.round((activeObject.opacity || 1) * 100) + '%';
    document.getElementById('objPropertyNotes').value = props.notes || '';
    document.getElementById('objPropertyCustomData').value = JSON.stringify(props.customData || {}, null, 2);
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
      notes: document.getElementById('objPropertyNotes').value.trim() || null
    };

    const customDataText = document.getElementById('objPropertyCustomData').value.trim();
    if (customDataText) {
      try {
        newProperties.customData = JSON.parse(customDataText);
      } catch (e) {
        showNotification('Ошибка в JSON: ' + e.message, 'error');
        return;
      }
    }

    const oldProps = currentEditingObject.properties || {};
    if (oldProps.imageId) newProperties.imageId = oldProps.imageId;
    if (oldProps.imagePath) newProperties.imagePath = oldProps.imagePath;
    if (oldProps.L !== undefined) newProperties.L = oldProps.L;
    if (oldProps.I !== undefined) newProperties.I = oldProps.I;
    if (oldProps.K !== undefined) newProperties.K = oldProps.K;
    if (oldProps.W !== undefined) newProperties.W = oldProps.W;
    if (oldProps.length !== undefined) newProperties.length = oldProps.length;

    const updates = {
      properties: newProperties,
      left: parseInt(document.getElementById('objPropertyX').value) || currentEditingObject.left,
      top: parseInt(document.getElementById('objPropertyY').value) || currentEditingObject.top,
      angle: parseInt(document.getElementById('objPropertyRotation').value) || 0,
      opacity: (parseInt(document.getElementById('objPropertyOpacity').value) || 100) / 100
    };

    if (currentEditingObject.type === 'image') {
      const newWidth = parseInt(document.getElementById('objPropertyWidth').value);
      const newHeight = parseInt(document.getElementById('objPropertyHeight').value);

      if (newWidth && newHeight) {
        const originalWidth = currentEditingObject._element?.naturalWidth || currentEditingObject.width;
        const originalHeight = currentEditingObject._element?.naturalHeight || currentEditingObject.height;

        updates.scaleX = newWidth / originalWidth;
        updates.scaleY = newHeight / originalHeight;
      }
    }

    currentEditingObject.set(updates);
    canvas.renderAll();

    updatePropertiesPanel();
    closeObjectPropertiesModal();
    showNotification('Свойства объекта обновлены', 'success');

  } catch (error) {
    showNotification('Ошибка при сохранении: ' + error.message, 'error');
  }
}

function deleteCurrentObject() {
  if (!currentEditingObject || !confirm('Удалить этот объект?')) return;

  saveToUndoStack();
  canvas.remove(currentEditingObject);
  canvas.renderAll();

  closeObjectPropertiesModal();
  updatePropertiesPanel();
  updateStatus();
  showNotification('Объект удален', 'info');
}

function showIntersectionPointInfo(pointIndex) {
  const pointData = intersectionPoints[pointIndex];
  if (!pointData) return;

  let html = `
    <div class="property-group">
      <h4>📌 Точка разделения #${pointIndex + 1}</h4>
      <div class="property-row">
        <div class="property-label">Координаты:</div>
        <div class="property-value">X: ${pointData.x.toFixed(1)}, Y: ${pointData.y.toFixed(1)}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Тип:</div>
        <div class="property-value">
  `;

  if (pointData.type === 'object-center') {
    html += 'Центр объекта';
  } else if (pointData.type === 'object-edge') {
    html += 'Край объекта';
  } else if (pointData.line1 && pointData.line2) {
    html += 'Пересечение линий';
  } else {
    html += 'Пересечение линии с объектом';
  }

  html += `
        </div>
      </div>
    </div>
  `;

  document.getElementById('intersectionPointInfo').innerHTML = html;
  document.getElementById('intersectionPointModal').style.display = 'flex';
}

function closeIntersectionPointModal() {
  document.getElementById('intersectionPointModal').style.display = 'none';
}

// ==================== ПАНЕЛЬ СВОЙСТВ ====================
function updatePropertiesPanel() {
  const activeObj = canvas.getActiveObject();
  const propsContent = document.getElementById('props-content');

  if (!activeObj) {
    propsContent.innerHTML = `
      <p style="color: #7f8c8d; font-style: italic; text-align: center; padding: 20px;">
        Выберите объект на чертеже
      </p>
    `;
    return;
  }

  let content = `
    <div class="property-group">
      <h4>📄 Основные свойства</h4>
      <div class="property-row">
        <div class="property-label">Тип:</div>
        <div class="property-value"><strong>${activeObj.type}</strong></div>
      </div>
  `;

  if (activeObj.type === 'line') {
    const length = Math.sqrt(
      Math.pow(activeObj.x2 - activeObj.x1, 2) +
      Math.pow(activeObj.y2 - activeObj.y1, 2)
    );
    content += `
      <div class="property-row">
        <div class="property-label">Длина:</div>
        <div class="property-value">${Math.round(length)}px</div>
      </div>
    `;

    if (activeObj.lineStartsFromObject && activeObj.startObject) {
      const objProps = activeObj.startObject.properties || {};
      content += `
        <div class="property-group">
          <h4>📌 Привязка к объекту</h4>
          <div class="property-row">
            <div class="property-label">Начинается от:</div>
            <div class="property-value">${objProps.name || 'Объект'}</div>
          </div>
          <div class="property-row">
            <div class="property-label">Тип привязки:</div>
            <div class="property-value">${activeObj.properties?.startsFromObject?.edgePoint ? 'Край объекта' : 'Центр объекта'}</div>
          </div>
        </div>
      `;
    }

    if (activeObj.properties) {
      content += `
        <div class="property-group">
          <h4>📊 Технические параметры</h4>
          <div class="property-row">
            <div class="property-label">Название:</div>
            <div class="property-value">${activeObj.properties.name || 'Без названия'}</div>
          </div>
          <div class="property-row">
            <div class="property-label">L (м²):</div>
            <div class="property-value">${(activeObj.properties.L || 0).toFixed(4)}</div>
          </div>
          <div class="property-row">
            <div class="property-label">I:</div>
            <div class="property-value">${(activeObj.properties.I || 0).toFixed(6)}</div>
          </div>
          <div class="property-row">
            <div class="property-label">К (м):</div>
            <div class="property-value">${(activeObj.properties.K || 0).toFixed(3)}</div>
          </div>
          <div class="property-row">
            <div class="property-label">W (кг/м):</div>
            <div class="property-value">${(activeObj.properties.W || 0).toFixed(2)}</div>
          </div>
        </div>
      `;
    }

    content += `
      <div style="margin-top: 15px; text-align: center;">
        <button onclick="showLinePropertiesModal()" style="padding: 8px 16px; font-size: 13px; margin-right: 5px;">
          ⚙️ Редактировать параметры линии
        </button>
        <button onclick="showObjectPropertiesModal()" style="padding: 8px 16px; font-size: 13px;">
          📝 Редактировать общие свойства
        </button>
      </div>
    `;
  } else if (activeObj.type === 'image') {
    const props = activeObj.properties || {};
    content += `
      <div class="property-row">
        <div class="property-label">Название:</div>
        <div class="property-value">${props.name || 'Изображение'}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Тип:</div>
        <div class="property-value">${props.type || 'default'}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Позиция:</div>
        <div class="property-value">${Math.round(activeObj.left)} × ${Math.round(activeObj.top)}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Размер:</div>
        <div class="property-value">${Math.round(activeObj.width * activeObj.scaleX)} × ${Math.round(activeObj.height * activeObj.scaleY)} px</div>
      </div>
    `;

    if (props.notes) {
      content += `
        <div class="property-row">
          <div class="property-label">Примечания:</div>
          <div class="property-value">${props.notes}</div>
        </div>
      `;
    }

    content += `
      <div style="margin-top: 15px; text-align: center;">
        <button onclick="showObjectPropertiesModal()" style="padding: 8px 16px; font-size: 13px;">
          ⚙️ Редактировать свойства
        </button>
      </div>
    `;
  } else if (activeObj.type === 'rect' || activeObj.type === 'circle' || activeObj.type === 'triangle') {
    const props = activeObj.properties || {};
    content += `
      <div class="property-row">
        <div class="property-label">Название:</div>
        <div class="property-value">${props.name || activeObj.type}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Позиция:</div>
        <div class="property-value">${Math.round(activeObj.left)} × ${Math.round(activeObj.top)}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Размер:</div>
        <div class="property-value">${Math.round(activeObj.width * (activeObj.scaleX || 1))} × ${Math.round(activeObj.height * (activeObj.scaleY || 1))} px</div>
      </div>
    `;

    content += `
      <div style="margin-top: 15px; text-align: center;">
        <button onclick="showObjectPropertiesModal()" style="padding: 8px 16px; font-size: 13px;">
          ⚙️ Редактировать свойства
        </button>
      </div>
    `;
  } else {
    const props = activeObj.properties || {};
    content += `
      <div class="property-row">
        <div class="property-label">Название:</div>
        <div class="property-value">${props.name || activeObj.type || 'Объект'}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Позиция:</div>
        <div class="property-value">${Math.round(activeObj.left || 0)} × ${Math.round(activeObj.top || 0)}</div>
      </div>
    `;

    content += `
      <div style="margin-top: 15px; text-align: center;">
        <button onclick="showObjectPropertiesModal()" style="padding: 8px 16px; font-size: 13px;">
          ⚙️ Редактировать свойства
        </button>
      </div>
    `;
  }

  content += `</div>`;
  propsContent.innerHTML = content;
}

// ==================== СОХРАНЕНИЕ И ЗАГРУЗКА ====================
function saveDrawing() {
  const json = JSON.stringify(canvas.toJSON(['id', 'properties', 'pointIndex', 'pointData', 'lineStartsFromObject', 'startObject']));
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

  const count = canvas.getObjects().filter(obj => obj.id !== 'grid-group' && obj.id !== 'grid-line').length;
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
        drawGrid(20);

        canvas.loadFromJSON(json, function () {
          canvas.getObjects().forEach(obj => {
            if (obj.lineStartsFromObject && obj.properties?.startsFromObject?.objectId) {
              const startObject = canvas.getObjects().find(o =>
                (o.id === obj.properties.startsFromObject.objectId ||
                  o._id === obj.properties.startsFromObject.objectId)
              );
              if (startObject) {
                obj.startObject = startObject;
              }
            }
          });

          canvas.renderAll();
          updatePropertiesPanel();
          updateStatus();
          const count = canvas.getObjects().filter(obj => obj.id !== 'grid-group' && obj.id !== 'grid-line').length;
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

// ==================== УПРАВЛЕНИЕ ОБЪЕКТАМИ ====================
function clearCanvas() {
  if (!confirm('Удалить все объекты с чертежа?')) return;

  deactivateAllModes();
  lastLineEndPoint = null;
  clearIntersectionPoints();

  canvas.getObjects().forEach(obj => {
    if (obj.id !== 'grid-group' && obj.id !== 'grid-line') {
      canvas.remove(obj);
    }
  });

  canvas.renderAll();
  updatePropertiesPanel();
  updateStatus();
  showNotification('Холст очищен', 'info');
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
  if (x + rect.width > window.innerWidth) {
    contextMenu.style.left = (x - rect.width) + 'px';
  }
  if (y + rect.height > window.innerHeight) {
    contextMenu.style.top = (y - rect.height) + 'px';
  }
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

  saveToUndoStack();
  canvas.remove(activeObject);
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
    clone.left += 20;
    clone.top += 20;
    canvas.add(clone);
    canvas.setActiveObject(clone);
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

// ==================== ОТМЕНА/ПОВТОР ====================
function saveToUndoStack() {
  const json = JSON.stringify(canvas.toJSON(['id', 'properties']));
  undoStack.push(json);
  redoStack = [];

  if (undoStack.length > 50) {
    undoStack.shift();
  }

  updateUndoRedoButtons();
}

function undoAction() {
  if (undoStack.length < 2) return;

  const currentState = undoStack.pop();
  redoStack.push(currentState);

  const previousState = undoStack[undoStack.length - 1];
  canvas.loadFromJSON(previousState, function () {
    canvas.renderAll();
    updatePropertiesPanel();
    updateStatus();
  });

  updateUndoRedoButtons();
  showNotification('Действие отменено', 'info');
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('undoBtn');
  if (undoBtn) {
    undoBtn.disabled = undoStack.length < 2;
  }
}

// ==================== УВЕДОМЛЕНИЯ ====================
function showNotification(message, type = 'info', duration = 3000) {
  const container = document.getElementById('notificationContainer');
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${getNotificationIcon(type)}</span>
    <span>${message}</span>
  `;

  container.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, duration);
}

function getNotificationIcon(type) {
  switch (type) {
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    default:
      return 'ℹ️';
  }
}

// ==================== ПРЕДОТВРАЩЕНИЕ КОНТЕКСТНОГО МЕНЮ ====================
document.addEventListener('DOMContentLoaded', function () {
  const canvasElement = document.getElementById('fabric-canvas');
  if (canvasElement) {
    canvasElement.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
  }
});