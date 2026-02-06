// ==================== КОНСТАНТЫ И ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
const APP_CONFIG = {
  GRID_SIZE: 20,
  SNAP_RADIUS: 15,
  MAX_UNDO_STEPS: 50,
  DEFAULT_LINE_COLOR: '#4A00E0',
  DEFAULT_LINE_WIDTH: 5,
  MAX_IMAGE_SIZE: 40
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

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function () {
  initializeCanvas();
  updateImageLibrary();
  updateStatus();
  initializeModals();
  setupKeyboardShortcuts();
  setupAltKeyTracking();

  // Добавляем кнопку отчета в интерфейс
  setTimeout(() => {
    addAirVolumeReportButton();
  }, 100);

  // Обработчик изменения размера окна
  window.addEventListener('resize', handleResize);

  console.log('Редактор технических чертежей загружен!');
});

// Добавьте в самое начало кода (перед всеми функциями)
(function () {
  const originalError = console.error;
  console.error = function (...args) {
    if (args[0] && typeof args[0] === 'string' &&
      args[0].includes('alphabetical') &&
      args[0].includes('CanvasTextBaseline')) {
      // Игнорируем эту ошибку
      return;
    }
    originalError.apply(console, args);
  };
})();


function initializeCanvas() {
  canvas = new fabric.Canvas('fabric-canvas', {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true,
    selectionColor: 'rgba(74, 0, 224, 0.3)',
    selectionBorderColor: '#4A00E0',
    selectionLineWidth: 2,
    renderOnAddRemove: false // Для оптимизации
  });

  // Добавьте этот код в начало функции initializeCanvas() или после создания canvas
  (function () {
    // Сохраняем оригинальный console.error
    const originalError = console.error;

    console.error = function (...args) {
      // Игнорируем ошибки CanvasTextBaseline
      if (args[0] &&
        typeof args[0] === 'string' &&
        args[0].includes('CanvasTextBaseline') &&
        args[0].includes('alphabetical')) {
        console.warn('CanvasTextBaseline issue suppressed');
        return;
      }

      // Для всех остальных ошибок используем оригинальный console.error
      originalError.apply(console, args);
    };
  })();

  // Устанавливаем начальный размер
  updateCanvasSize();

  drawGrid(APP_CONFIG.GRID_SIZE);
  setupCanvasEvents();
}

// Функция для обновления размеров canvas
function updateCanvasSize() {
  if (!canvas) return;

  const wrapper = document.getElementById('canvas-wrapper');
  if (!wrapper) return;

  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;

  // Устанавливаем новые размеры
  canvas.setDimensions({
    width: width,
    height: height
  });

  // Перерисовываем сетку если она видима
  if (gridVisible) {
    drawGrid(APP_CONFIG.GRID_SIZE);
  }

  canvas.renderAll();
}

// Обработчик изменения размера окна
function handleResize() {
  updateCanvasSize();
}

// ==================== УТИЛИТЫ ====================
function roundTo5(value) {
  if (value === null || value === undefined) return value;
  return Math.round((value + Number.EPSILON) * 100000) / 100000;
}

function formatTo5(value) {
  if (value === null || value === undefined) return '0.00000';
  return roundTo5(value).toFixed(5);
}

// ==================== ФУНКЦИИ ДЛЯ ОТОБРАЖЕНИЯ ОБЪЕМА ВОЗДУХА ====================
function createOrUpdateAirVolumeText(line) {
  // Удаляем старый текст, если он существует
  if (line.airVolumeText) {
    try {
      canvas.remove(line.airVolumeText);
    } catch (e) {
      console.warn('Error removing air volume text:', e);
    }
    line.airVolumeText = null;
  }

  // Если у линии нет свойства airVolume, не создаем текст
  if (!line.properties || line.properties.airVolume === undefined || line.properties.airVolume === null) {
    return;
  }

  try {
    // Вычисляем середину линии
    const midX = (line.x1 + line.x2) / 2;
    const midY = (line.y1 + line.y2) / 2;

    // Вычисляем угол линии для правильной ориентации текста
    const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);
    const degrees = angle * (180 / Math.PI);

    // Определяем смещение текста относительно линии
    const offset = 20;
    const offsetX = Math.sin(angle) * offset;
    const offsetY = -Math.cos(angle) * offset;

    // Создаем текст с объемом воздуха - ВАЖНО: используем только поддерживаемые свойства
    const textOptions = {
      left: midX + offsetX,
      top: midY + offsetY,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fill: line.stroke || APP_CONFIG.DEFAULT_LINE_COLOR,
      fontWeight: 'bold',
      textBackgroundColor: 'rgba(255, 255, 255, 0.8)',
      padding: 3,
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

    const airVolumeText = new fabric.Text(`${formatTo5(line.properties.airVolume)} м³/с`, textOptions);

    // Сохраняем ссылку на текст в линии
    line.airVolumeText = airVolumeText;

    // Добавляем текст на холст
    canvas.add(airVolumeText);

    // Перемещаем текст на передний план
    airVolumeText.bringToFront();

    return airVolumeText;

  } catch (error) {
    console.error('Error creating air volume text:', error);
    return null;
  }
}

function updateAllAirVolumeTexts() {
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  lines.forEach(line => {
    // createOrUpdateAirVolumeText(line);
  });

  canvas.renderAll();
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

// ==================== ФУНКЦИЯ РАСЧЕТА ОБЪЕМА ВОЗДУХА ДЛЯ ЛИНИЙ ====================
function calculateAirVolumesForAllLines() {
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  const images = canvas.getObjects().filter(obj =>
    obj.type === 'image' && obj.properties
  );

  // Шаг 1: Сбор информации о всех точках пересечения
  const intersectionPointsMap = new Map();

  // Собираем все точки пересечения линий с объектами и другими линиями
  lines.forEach(line => {
    const startKey = `${roundTo5(line.x1)}_${roundTo5(line.y1)}`;
    const endKey = `${roundTo5(line.x2)}_${roundTo5(line.y2)}`;

    if (!intersectionPointsMap.has(startKey)) {
      intersectionPointsMap.set(startKey, {
        x: roundTo5(line.x1),
        y: roundTo5(line.y1),
        linesStarting: [],
        linesEnding: [],
        objects: []
      });
    }

    if (!intersectionPointsMap.has(endKey)) {
      intersectionPointsMap.set(endKey, {
        x: roundTo5(line.x2),
        y: roundTo5(line.y2),
        linesStarting: [],
        linesEnding: [],
        objects: []
      });
    }

    // Добавляем линию как начинающуюся в стартовой точке
    intersectionPointsMap.get(startKey).linesStarting.push(line);

    // Добавляем линию как заканчивающуюся в конечной точке
    intersectionPointsMap.get(endKey).linesEnding.push(line);
  });

  // Добавляем объекты в точки пересечения
  images.forEach(image => {
    const center = getObjectCenter(image);
    const centerKey = `${roundTo5(center.x)}_${roundTo5(center.y)}`;

    // Проверяем, совпадает ли центр объекта с какой-либо точкой пересечения
    for (const [key, pointData] of intersectionPointsMap.entries()) {
      const distance = roundTo5(Math.sqrt(
        Math.pow(pointData.x - center.x, 2) +
        Math.pow(pointData.y - center.y, 2)
      ));

      // Если объект находится в точке пересечения (в пределах допуска)
      if (distance < 5) { // Допуск 5px
        pointData.objects.push(image);
      }
    }
  });

  // Шаг 2: Расчет объема воздуха по принципам
  const linesToUpdate = new Set();

  // Принцип 1: Если линия начинается от объекта с объемом воздуха
  lines.forEach(line => {
    if (line.lineStartsFromObject && line.startObject) {
      const obj = line.startObject;
      if (obj.properties && obj.properties.airVolume !== undefined && obj.properties.airVolume !== null) {
        if (!line.properties.airVolume || line.properties.airVolume !== obj.properties.airVolume) {
          line.properties.airVolume = roundTo5(obj.properties.airVolume);
          linesToUpdate.add(line);
        }
      }
    }
  });

  // Принцип 2: Передача объема воздуха между линиями в точках пересечения
  for (const [key, pointData] of intersectionPointsMap.entries()) {
    // Если в точке есть линии, заканчивающиеся и начинающиеся
    if (pointData.linesEnding.length === 1 && pointData.linesStarting.length === 1) {
      const endingLine = pointData.linesEnding[0];
      const startingLine = pointData.linesStarting[0];

      // Проверяем, есть ли у заканчивающейся линии объем воздуха
      if (endingLine.properties && endingLine.properties.airVolume !== undefined && endingLine.properties.airVolume !== null) {
        // Передаем объем воздуха начинающейся линии
        if (!startingLine.properties.airVolume || startingLine.properties.airVolume !== endingLine.properties.airVolume) {
          startingLine.properties.airVolume = roundTo5(endingLine.properties.airVolume);
          linesToUpdate.add(startingLine);
        }
      }
    }

    // Принцип 1 (альтернативный подход): Если в точке есть объект с объемом воздуха
    // и есть линии, начинающиеся в этой точке
    if (pointData.objects.length > 0 && pointData.linesStarting.length > 0) {
      pointData.objects.forEach(obj => {
        if (obj.properties && obj.properties.airVolume !== undefined && obj.properties.airVolume !== null) {
          pointData.linesStarting.forEach(line => {
            if (!line.properties.airVolume || line.properties.airVolume !== obj.properties.airVolume) {
              line.properties.airVolume = roundTo5(obj.properties.airVolume);
              linesToUpdate.add(line);
            }
          });
        }
      });
    }
  }

  // Шаг 3: Обновляем линии и их текстовые метки, если нужно
  if (linesToUpdate.size > 0) {
    linesToUpdate.forEach(line => {
      line.set('properties', line.properties);
      // createOrUpdateAirVolumeText(line);
    });

    canvas.renderAll();
    updatePropertiesPanel();
    return true;
  }

  return false;
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
  const x1 = line.x1;
  const y1 = line.y1;
  const x2 = line.x2;
  const y2 = line.y2;

  const A = roundTo5(point.x - x1);
  const B = roundTo5(point.y - y1);
  const C = roundTo5(x2 - x1);
  const D = roundTo5(y2 - y1);

  const dot = roundTo5(A * C + B * D);
  const lenSq = roundTo5(C * C + D * D);

  let param = -1;
  if (lenSq !== 0) {
    param = roundTo5(dot / lenSq);
  }

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

  return {
    x: roundTo5(xx),
    y: roundTo5(yy),
    param: param
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
      const distToLeft = roundTo5(Math.abs(point.x - left));
      const distToRight = roundTo5(Math.abs(point.x - right));
      const distToTop = roundTo5(Math.abs(point.y - top));
      const distToBottom = roundTo5(Math.abs(point.y - bottom));

      const minDist = roundTo5(Math.min(distToLeft, distToRight, distToTop, distToBottom));

      if (minDist === distToLeft) {
        return {x: roundTo5(left), y: roundTo5(point.y)};
      } else if (minDist === distToRight) {
        return {x: roundTo5(right), y: roundTo5(point.y)};
      } else if (minDist === distToTop) {
        return {x: roundTo5(point.x), y: roundTo5(top)};
      } else {
        return {x: roundTo5(point.x), y: roundTo5(bottom)};
      }
    } else {
      let closestX = roundTo5(Math.max(left, Math.min(point.x, right)));
      let closestY = roundTo5(Math.max(top, Math.min(point.y, bottom)));

      const distToLeft = roundTo5(Math.abs(point.x - left));
      const distToRight = roundTo5(Math.abs(point.x - right));
      const distToTop = roundTo5(Math.abs(point.y - top));
      const distToBottom = roundTo5(Math.abs(point.y - bottom));

      const minDist = roundTo5(Math.min(distToLeft, distToRight, distToTop, distToBottom));

      if (minDist === distToLeft || minDist === distToRight) {
        closestY = roundTo5(point.y);
      } else {
        closestX = roundTo5(point.x);
      }

      closestX = roundTo5(Math.max(left, Math.min(closestX, right)));
      closestY = roundTo5(Math.max(top, Math.min(closestY, bottom)));

      return {x: closestX, y: closestY};
    }
  }

  if (object.type === 'circle') {
    const radius = roundTo5(object.radius * object.scaleX);
    const dx = roundTo5(point.x - center.x);
    const dy = roundTo5(point.y - center.y);
    const distance = roundTo5(Math.sqrt(dx * dx + dy * dy));

    if (distance === 0) {
      return {x: roundTo5(center.x + radius), y: roundTo5(center.y)};
    }

    const scale = roundTo5(radius / distance);
    return {
      x: roundTo5(center.x + dx * scale),
      y: roundTo5(center.y + dy * scale)
    };
  }

  return {
    x: roundTo5(Math.max(objRect.left, Math.min(point.x, objRect.right))),
    y: roundTo5(Math.max(objRect.top, Math.min(point.y, objRect.bottom)))
  };
}

// ==================== СОБЫТИЯ КАНВАСА ====================
function setupCanvasEvents() {
  if (!canvas) return;

  canvas.on('mouse:down', handleCanvasMouseDown);
  canvas.on('mouse:move', handleCanvasMouseMove);
  canvas.on('mouse:out', handleCanvasMouseOut);
  canvas.on('mouse:dblclick', handleCanvasDoubleClick);

  canvas.on('selection:created', updatePropertiesPanel);
  canvas.on('selection:updated', updatePropertiesPanel);
  canvas.on('selection:cleared', updatePropertiesPanel);

  canvas.on('object:added', handleObjectAdded);
  canvas.on('object:modified', handleObjectModified);
  canvas.on('object:removed', handleObjectRemoved);
}

function handleCanvasMouseDown(options) {
  const pointer = canvas.getPointer(options.e);

  if (options.e.shiftKey && currentImageData) {
    addImageAtPosition(pointer.x, pointer.y);
    return;
  }

  if (isDrawingLine) {
    handleLineDrawing(options, pointer);
    return;
  }

  if (options.e.button === 2) {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      showContextMenu(pointer.x, pointer.y);
    }
    options.e.preventDefault();
  }
}

function handleCanvasMouseMove(options) {
  const pointer = canvas.getPointer(options.e);

  if (isDrawingLine && lineStartPoint && previewLine) {
    const snappedX = roundTo5(snapToGrid(pointer.x, APP_CONFIG.GRID_SIZE));
    const snappedY = roundTo5(snapToGrid(pointer.y, APP_CONFIG.GRID_SIZE));
    previewLine.set({x2: snappedX, y2: snappedY});
    previewLine.setCoords();
    canvas.requestRenderAll();

    if (altKeyPressed) {
      canvas.forEachObject(obj => {
        if (obj.type !== 'line' && obj.id !== 'grid-group' && obj.id !== 'grid-line') {
          obj.set('stroke', '#4A00E0');
          obj.set('strokeWidth', 2);
        }
      });
      canvas.renderAll();
    }
  }
}

function handleCanvasMouseOut() {
  if (altKeyPressed && isDrawingLine) {
    canvas.forEachObject(obj => {
      if (obj.type !== 'line' && obj.id !== 'grid-group' && obj.id !== 'grid-line') {
        obj.set('stroke', null);
        obj.set('strokeWidth', 0);
      }
    });
    canvas.renderAll();
  }
}

function handleCanvasDoubleClick(options) {
  if (options.target) {
    canvas.setActiveObject(options.target);
    showObjectPropertiesModal();
  }
}

function handleObjectAdded(e) {
  if (e.target && e.target.id !== 'intersection-point' && e.target.id !== 'intersection-point-label' && e.target.id !== 'air-volume-text') {
    setTimeout(() => {
      bringIntersectionPointsToFront();
      // Обновляем тексты объемов воздуха для всех линий
      updateAllAirVolumeTexts();
    }, 10);
  }
}

function handleObjectModified(e) {
  if (e.target && e.target.type === 'line' && e.target.properties) {
    calculateAllLineProperties(e.target);
    // Обновляем текст объема воздуха при изменении линии
    // createOrUpdateAirVolumeText(e.target);
  }
}

function handleObjectRemoved(e) {
  // Удаляем текст объема воздуха при удалении линии
  if (e.target && e.target.type === 'line' && e.target.airVolumeText) {
    removeAirVolumeText(e.target);
  }
}

function handleLineDrawing(options, pointer) {
  let snappedX, snappedY;
  let startPointFromObject = null;

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

  if (isContinuousLineMode && lastLineEndPoint && !startPointFromObject) {
    const distanceToLastPoint = roundTo5(Math.sqrt(
      Math.pow(pointer.x - lastLineEndPoint.x, 2) +
      Math.pow(pointer.y - lastLineEndPoint.y, 2)
    ));

    if (distanceToLastPoint < APP_CONFIG.SNAP_RADIUS) {
      snappedX = roundTo5(lastLineEndPoint.x);
      snappedY = roundTo5(lastLineEndPoint.y);
    } else {
      snappedX = roundTo5(snapToGrid(pointer.x, APP_CONFIG.GRID_SIZE));
      snappedY = roundTo5(snapToGrid(pointer.y, APP_CONFIG.GRID_SIZE));
    }
  } else if (!startPointFromObject) {
    snappedX = roundTo5(snapToGrid(pointer.x, APP_CONFIG.GRID_SIZE));
    snappedY = roundTo5(snapToGrid(pointer.y, APP_CONFIG.GRID_SIZE));
  }

  if (!lineStartPoint) {
    let initialAirVolume = 0;
    if (startPointFromObject && startPointFromObject.object && startPointFromObject.object.properties) {
      initialAirVolume = roundTo5(startPointFromObject.object.properties.airVolume || 0);
    }

    lineStartPoint = {
      x: snappedX,
      y: snappedY,
      ...startPointFromObject
    };

    previewLine = new fabric.Line([
      lineStartPoint.x, lineStartPoint.y, snappedX, snappedY
    ], {
      stroke: APP_CONFIG.DEFAULT_LINE_COLOR,
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false
    });

    if (startPointFromObject) {
      previewLine.lineStartsFromObject = true;
      previewLine.startObject = startPointFromObject.object;
      previewLine.initialAirVolume = initialAirVolume;
    }

    canvas.add(previewLine);
  } else {
    const length = roundTo5(Math.sqrt(
      Math.pow(snappedX - lineStartPoint.x, 2) +
      Math.pow(snappedY - lineStartPoint.y, 2)
    ));

    const passageLength = roundTo5(parseFloat(document.getElementById('propertyPassageLength')?.value) || 0.5);
    const roughnessCoefficient = roundTo5(parseFloat(document.getElementById('propertyRoughnessCoefficient')?.value) || 0.015);
    const crossSectionalArea = roundTo5(parseFloat(document.getElementById('propertyCrossSectionalArea')?.value) || 10);
    const perimeter = calculateLinePerimeter(crossSectionalArea);
    const airResistance = calculateAirResistance(roughnessCoefficient, perimeter, passageLength, crossSectionalArea);

    let airVolume = roundTo5(parseFloat(document.getElementById('propertyAirVolume')?.value) || 0);

    if (lineStartPoint.object && lineStartPoint.object.properties &&
      lineStartPoint.object.properties.airVolume !== undefined &&
      lineStartPoint.object.properties.airVolume !== null) {
      airVolume = roundTo5(lineStartPoint.object.properties.airVolume);
    }

    // Генерируем уникальный ID для линии
    const lineId = 'line_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const finalLine = new fabric.Line([
      lineStartPoint.x, lineStartPoint.y, snappedX, snappedY
    ], {
      stroke: document.getElementById('propertyColor')?.value || APP_CONFIG.DEFAULT_LINE_COLOR,
      strokeWidth: parseInt(document.getElementById('propertyWidth')?.value || APP_CONFIG.DEFAULT_LINE_WIDTH),
      fill: false,
      strokeLineCap: 'round',
      hasControls: true,
      hasBorders: true,
      lockRotation: false,
      id: lineId,
      properties: {
        name: document.getElementById('propertyName')?.value || `Линия`,
        passageLength: passageLength,
        roughnessCoefficient: roughnessCoefficient,
        crossSectionalArea: crossSectionalArea,
        W: roundTo5(parseFloat(document.getElementById('propertyW')?.value) || 1.0),
        airResistance: airResistance,
        airVolume: airVolume,
        perimeter: perimeter,
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

    // Создаем текст с объемом воздуха для новой линии
    // createOrUpdateAirVolumeText(finalLine);

    canvas.setActiveObject(finalLine);
    updatePropertiesPanel();

    // Вызываем расчет объемов воздуха после создания линии
    setTimeout(() => {
      calculateAirVolumesForAllLines();
    }, 10);

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
}

// ==================== УПРАВЛЕНИЕ РЕЖИМАМИ ====================
function activateLineDrawing() {
  deactivateAllModes();
  isDrawingLine = true;
  canvas.defaultCursor = 'crosshair';
  canvas.selection = false;
  canvas.forEachObject(obj => obj.selectable = false);

  const modeText = isContinuousLineMode
    ? 'Режим рисования линии (непрерывный). Кликните для начала, затем для конца.'
    : 'Режим рисования линии. Кликните для начала, затем для конца.';
  const altHint = ' Удерживайте Alt для привязки к краям объектов.';

  showNotification(modeText + altHint + ' ESC для отмены.', 'info');
}

function deactivateAllModes() {
  if (isDrawingLine) {
    isDrawingLine = false;
    if (previewLine) {
      canvas.remove(previewLine);
      previewLine = null;
    }
    lineStartPoint = null;
    lastLineEndPoint = null;
  }

  if (currentImageData) {
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

// ==================== СЕТКА ====================
function drawGrid(gridSize = APP_CONFIG.GRID_SIZE) {
  const oldGrid = canvas ? canvas.getObjects().filter(obj => obj.id === 'grid-group') : [];
  oldGrid.forEach(obj => canvas.remove(obj));

  if (!gridVisible || !canvas) return;

  // Используем текущие размеры canvas
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

// ==================== ИЗОБРАЖЕНИЯ ====================
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

function updateImageLibrary() {
  const grid = document.getElementById('imageLibraryGrid');
  if (!grid) return;

  grid.innerHTML = '';

  allImages.forEach(image => {
    const button = document.createElement('button');
    button.className = 'image-item';
    button.innerHTML = `
            <img src="${image.path}" alt="${image.name}" loading="lazy">
            <div class="image-item-name">${image.name}</div>
        `;

    button.onclick = () => activateImagePlacementMode(image);
    grid.appendChild(button);
  });
}

function activateImagePlacementMode(image) {
  deactivateAllModes();
  currentImageData = image;

  document.querySelectorAll('.image-item').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  canvas.defaultCursor = 'crosshair';
  canvas.selection = false;

  showNotification(`Режим добавления: ${image.name}. Кликните на холст для размещения.`, 'info');
}

function addImageAtPosition(x, y) {
  if (!currentImageData) {
    showNotification('Сначала выберите изображение!', 'error');
    return;
  }

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

    if (autoSplitMode) {
      setTimeout(() => {
        splitLinesAtImagePosition(img);
      }, 50);
    }

    updatePropertiesPanel();
    updateStatus();
    showNotification(`${currentImageData.name} добавлен`, 'success');

  }, {crossOrigin: 'anonymous'});
}

// ==================== РАЗДЕЛЕНИЕ ЛИНИЙ ====================
function splitAllLines() {
  clearIntersectionPoints();
  const intersections = findAllIntersections();
  intersectionPoints = intersections;

  intersections.forEach((inter, index) => {
    createIntersectionPoint(inter.x, inter.y, index, inter);
  });

  intersections.forEach((inter, index) => {
    if (inter.line1 && inter.line2) {
      // Разделяем обе линии в точке пересечения
      const splitResult1 = splitLineAtPoint(inter.line1, {
        x: inter.x,
        y: inter.y
      });
      const splitResult2 = splitLineAtPoint(inter.line2, {
        x: inter.x,
        y: inter.y
      });

      if (splitResult1) {
        saveToUndoStack();
        canvas.remove(inter.line1);
        removeAirVolumeText(inter.line1);
        canvas.add(splitResult1.line1);
        canvas.add(splitResult1.line2);
      }

      if (splitResult2) {
        saveToUndoStack();
        canvas.remove(inter.line2);
        removeAirVolumeText(inter.line2);
        canvas.add(splitResult2.line1);
        canvas.add(splitResult2.line2);
      }
    } else if (inter.line1 && inter.object) {
      if (lineSplitMode !== 'MANUAL' || autoSplitMode) {
        const splitResult = splitLineAtPoint(inter.line1, {
          x: inter.x,
          y: inter.y
        });
        if (splitResult) {
          saveToUndoStack();
          canvas.remove(inter.line1);
          removeAirVolumeText(inter.line1);
          canvas.add(splitResult.line1);
          canvas.add(splitResult.line2);
        }
      }
    }
  });

  // Обновляем тексты объемов воздуха для всех линий
  setTimeout(() => {
    updateAllAirVolumeTexts();
  }, 50);

  canvas.renderAll();
  bringIntersectionPointsToFront();

  // Вызываем расчет объемов воздуха после разделения линий
  setTimeout(() => {
    calculateAirVolumesForAllLines();
  }, 100);

  if (intersections.length > 0) {
    showNotification(`Найдено ${intersections.length} точек пересечения`, 'success');
  } else {
    showNotification('Пересечений для разделения не найдено', 'info');
  }
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
        const tolerance = roundTo5(Math.max(image.width * image.scaleX,
          image.height * image.scaleY) / 2);
        const distanceToCenter = roundTo5(Math.sqrt(
          Math.pow(closestPoint.x - center.x, 2) +
          Math.pow(closestPoint.y - center.y, 2)
        ));

        if (distanceToCenter <= tolerance) {
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
            splitCount++;
          }
        }
      }
    });
  });

  // Обновляем тексты объемов воздуха для всех линий
  setTimeout(() => {
    updateAllAirVolumeTexts();
  }, 50);

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
        const tolerance = roundTo5(Math.max(image.width * image.scaleX,
          image.height * image.scaleY) / 2);
        const distanceToCenter = roundTo5(Math.sqrt(
          Math.pow(closestPoint.x - center.x, 2) +
          Math.pow(closestPoint.y - center.y, 2)
        ));

        if (distanceToCenter <= tolerance) {
          intersections.push({
            x: roundTo5(closestPoint.x),
            y: roundTo5(closestPoint.y),
            line1: line,
            object: image,
            type: 'object-center',
            objectCenter: center,
            param: roundTo5(closestPoint.param)
          });
        }
      }
    });
  });

  return intersections;
}

function lineIntersection(line1, line2) {
  if (line1 === line2) return null;

  const x1 = line1.x1, y1 = line1.y1;
  const x2 = line1.x2, y2 = line1.y2;
  const x3 = line2.x1, y3 = line2.y1;
  const x4 = line2.x2, y4 = line2.y2;

  const denominator = roundTo5((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

  if (Math.abs(denominator) < 0.000001) {
    return null;
  }

  const ua = roundTo5(((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator);
  const ub = roundTo5(((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator);

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    const x = roundTo5(x1 + ua * (x2 - x1));
    const y = roundTo5(y1 + ua * (y2 - y1));

    return {
      x: x,
      y: y,
      ua: ua,
      ub: ub,
      line1: line1,
      line2: line2
    };
  }

  return null;
}

function splitLineAtPoint(line, point) {
  const dx1 = roundTo5(point.x - line.x1);
  const dy1 = roundTo5(point.y - line.y1);
  const dx2 = roundTo5(point.x - line.x2);
  const dy2 = roundTo5(point.y - line.y2);

  const distance1 = roundTo5(Math.sqrt(dx1 * dx1 + dy1 * dy1));
  const distance2 = roundTo5(Math.sqrt(dx2 * dx2 + dy2 * dy2));

  if (distance1 < 0.1 || distance2 < 0.1) {
    return null;
  }

  const totalLength = roundTo5(Math.sqrt(
    Math.pow(line.x2 - line.x1, 2) +
    Math.pow(line.y2 - line.y1, 2)
  ));

  if (distance1 < 1 || distance2 < 1) {
    return null;
  }

  const lineVector = {
    x: roundTo5(line.x2 - line.x1),
    y: roundTo5(line.y2 - line.y1)
  };

  const pointVector = {
    x: roundTo5(point.x - line.x1),
    y: roundTo5(point.y - line.y1)
  };

  const dotProduct = roundTo5(lineVector.x * pointVector.x + lineVector.y * pointVector.y);
  const lineLengthSquared = roundTo5(lineVector.x * lineVector.x + lineVector.y * lineVector.y);

  const t = roundTo5(dotProduct / lineLengthSquared);

  if (t < 0 || t > 1) {
    return null;
  }

  normalizeLineProperties(line);
  const props = line.properties || {};

  const proportion1 = roundTo5(distance1 / totalLength);
  const proportion2 = roundTo5(distance2 / totalLength);

  const passageLength1 = roundTo5((props.passageLength || 0.5) * proportion1);
  const passageLength2 = roundTo5((props.passageLength || 0.5) * proportion2);
  const crossSectionalArea1 = roundTo5((props.crossSectionalArea || 0.5) * proportion2);
  const crossSectionalArea2 = roundTo5((props.crossSectionalArea || 0.5) * proportion2);

  const perimeter1 = calculateLinePerimeter(crossSectionalArea1);
  const perimeter2 = calculateLinePerimeter(crossSectionalArea2);

  const airResistance1 = calculateAirResistance(
    props.roughnessCoefficient || 0.015,
    perimeter1,
    passageLength1,
    props.crossSectionalArea || 10
  );

  const airResistance2 = calculateAirResistance(
    props.roughnessCoefficient || 0.015,
    perimeter2,
    passageLength2,
    props.crossSectionalArea || 10
  );

  const airVolume = roundTo5(props.airVolume || 0);

  // Генерируем уникальные ID для новых линий
  const line1Id = 'line_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const line2Id = 'line_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

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
    id: line1Id,
    properties: {
      ...props,
      length: distance1,
      passageLength: passageLength1,
      perimeter: perimeter1,
      airResistance: airResistance1,
      airVolume: airVolume,
      startPoint: {x: line.x1, y: line.y1},
      endPoint: {x: point.x, y: point.y}
    }
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
    id: line2Id,
    properties: {
      ...props,
      length: distance2,
      passageLength: passageLength2,
      perimeter: perimeter2,
      airResistance: airResistance2,
      airVolume: airVolume,
      startPoint: {x: point.x, y: point.y},
      endPoint: {x: line.x2, y: line.y2}
    }
  });

  if (line.lineStartsFromObject && line.startObject && line.x1 === line1.x1 && line.y1 === line1.y1) {
    line1.lineStartsFromObject = true;
    line1.startObject = line.startObject;
    if (line1.properties) {
      line1.properties.startsFromObject = line.properties?.startsFromObject;
    }
  }

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
      const tolerance = roundTo5(Math.max(image.width * image.scaleX,
        image.height * image.scaleY) / 2);
      const distanceToCenter = roundTo5(Math.sqrt(
        Math.pow(closestPoint.x - center.x, 2) +
        Math.pow(closestPoint.y - center.y, 2)
      ));

      if (distanceToCenter <= tolerance) {
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
          splitCount++;
        }
      }
    }
  });

  // Обновляем тексты объемов воздуха для всех линий
  setTimeout(() => {
    updateAllAirVolumeTexts();
  }, 50);

  if (splitCount > 0) {
    showNotification(`Разделено ${splitCount} линий по центру объектов`, 'success');
  }

  canvas.renderAll();
}

// ==================== ТОЧКИ ПЕРЕСЕЧЕНИЯ ====================
function createIntersectionPoint(x, y, index, intersectionData, customColor = '#ff4757') {
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

  // Левая кнопка мыши открывает модальное окно
  circle.on('mousedown', function (e) {
    if (e.e.button === 0) { // Левая кнопка мыши
      e.e.preventDefault();
      e.e.stopPropagation();
      showIntersectionPointInfo(index);
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

function createIntersectionPointForLineStart(line) {
  if (!line.lineStartsFromObject || !line.startObject) return;

  const startPoint = {
    x: line.x1,
    y: line.y1
  };

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

// ==================== МОДАЛЬНОЕ ОКНО ИНФОРМАЦИИ О ТОЧКЕ ====================
function showIntersectionPointInfo(pointIndex) {
  const pointData = intersectionPoints[pointIndex];
  if (!pointData) {
    showNotification('Точка не найдена', 'error');
    return;
  }

  const allLines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  const allObjects = canvas.getObjects().filter(obj =>
    obj.type !== 'line' && obj.id !== 'grid-group' && obj.id !== 'grid-line'
  );

  const linesStartingHere = [];
  const linesEndingHere = [];
  const objectsAtPoint = [];
  const threshold = 0.00001;

  allLines.forEach(line => {
    const startDist = roundTo5(Math.sqrt(Math.pow(line.x1 - pointData.x, 2) + Math.pow(line.y1 - pointData.y, 2)));
    const endDist = roundTo5(Math.sqrt(Math.pow(line.x2 - pointData.x, 2) + Math.pow(line.y2 - pointData.y, 2)));

    if (startDist < threshold) {
      linesStartingHere.push({
        line: line,
        type: 'start',
        distance: startDist
      });
    } else if (endDist < threshold) {
      linesEndingHere.push({
        line: line,
        type: 'end',
        distance: endDist
      });
    }
  });

  allObjects.forEach(obj => {
    const objRect = getObjectRect(obj);
    if (pointData.x >= objRect.left && pointData.x <= objRect.right &&
      pointData.y >= objRect.top && pointData.y <= objRect.bottom) {
      objectsAtPoint.push(obj);
    }
  });

  // Проверяем передачу объема воздуха
  let airVolumeTransferInfo = '';
  if (linesEndingHere.length === 1 && linesStartingHere.length === 1) {
    const endingLine = linesEndingHere[0].line;
    const startingLine = linesStartingHere[0].line;

    if (endingLine.properties && endingLine.properties.airVolume !== undefined &&
      startingLine.properties && startingLine.properties.airVolume !== undefined) {

      airVolumeTransferInfo = `
        <div class="property-group" style="margin-top: 15px; border-left: 3px solid #00b894; padding-left: 10px; background: #e8f6f3; padding: 10px; border-radius: 4px;">
          <h5 style="margin: 5px 0; color: #00b894;">📤 Передача объема воздуха:</h5>
          <div class="property-row">
            <div class="property-label">От линии (конец):</div>
            <div class="property-value"><strong>${formatTo5(endingLine.properties.airVolume)} м³/с</strong></div>
          </div>
          <div class="property-row">
            <div class="property-label">К линии (начало):</div>
            <div class="property-value"><strong>${formatTo5(startingLine.properties.airVolume)} м³/с</strong></div>
          </div>
          <div class="property-row">
            <div class="property-label">Статус:</div>
            <div class="property-value">
              ${Math.abs(endingLine.properties.airVolume - startingLine.properties.airVolume) < 0.0001
        ? '<span style="color: #00b894;">✓ Значения совпадают</span>'
        : '<span style="color: #e17055;">⚠ Значения различаются</span>'}
            </div>
          </div>
        </div>
      `;
    }
  }

  let html = `
    <div class="property-group">
      <h4>📌 Точка разделения #${pointIndex + 1}</h4>
      <div class="property-row">
        <div class="property-label">Координаты:</div>
        <div class="property-value">X: ${formatTo5(pointData.x)}, Y: ${formatTo5(pointData.y)}</div>
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
      <div class="property-row">
        <div class="property-label">Статистика:</div>
        <div class="property-value">
          🟢 ${linesStartingHere.length} начала | 🔴 ${linesEndingHere.length} окончаний | 🖼️ ${objectsAtPoint.length} объектов
        </div>
      </div>
  `;

  // Добавляем информацию о передаче объема воздуха
  if (airVolumeTransferInfo) {
    html += airVolumeTransferInfo;
  }

  // Отображаем дополнительные данные в зависимости от типа точки
  if (pointData.type === 'object-center' && pointData.object) {
    const obj = pointData.object;
    const center = getObjectCenter(obj);
    const props = obj.properties || {};

    html += `
      <div class="property-group">
        <h4>🎯 Центр объекта:</h4>
        <div class="property-row">
          <div class="property-label">Объект:</div>
          <div class="property-value">${props.name || 'Объект'}</div>
        </div>
        <div class="property-row">
          <div class="property-label">Координаты центра:</div>
          <div class="property-value">X: ${formatTo5(center.x)}, Y: ${formatTo5(center.y)}</div>
        </div>
      </div>
    `;
  }

  if (pointData.line1 && pointData.line2) {
    html += `
      <div class="property-group">
        <h4>📐 Информация о пересечении:</h4>
        <div class="property-row">
          <div class="property-label">Тип:</div>
          <div class="property-value">Пересечение двух линий</div>
        </div>
        ${pointData.ua !== undefined ? `
        <div class="property-row">
          <div class="property-label">Положение на линии 1:</div>
          <div class="property-value">${formatTo5(pointData.ua * 100)}% от начала</div>
        </div>
        ` : ''}
        ${pointData.ub !== undefined ? `
        <div class="property-row">
          <div class="property-label">Положение на линии 2:</div>
          <div class="property-value">${formatTo5(pointData.ub * 100)}% от начала</div>
        </div>
        ` : ''}
      </div>
    `;
  }

  if (objectsAtPoint.length > 0) {
    html += `
      <div class="property-group">
        <h4>🖼️ Объекты в точке:</h4>
    `;

    objectsAtPoint.forEach((obj, index) => {
      const props = obj.properties || {};

      html += `
        <div class="property-group" style="margin-top: 10px; border-left: 3px solid #4A00E0; padding-left: 10px; background: #f8f9fa; padding: 10px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h5 style="margin: 5px 0;">${props.name || `Объект ${index + 1}`} (${obj.type})</h5>
          </div>
          
          <div class="property-row">
            <div class="property-label">Тип объекта:</div>
            <div class="property-value">${props.type || 'Не указан'}</div>
          </div>
          <div class="property-row">
            <div class="property-label">Размер:</div>
            <div class="property-value">${formatTo5(obj.width * (obj.scaleX || 1))} × ${formatTo5(obj.height * (obj.scaleY || 1))} px</div>
          </div>
          <div class="property-row">
            <div class="property-label">Позиция:</div>
            <div class="property-value">${formatTo5(obj.left)} × ${formatTo5(obj.top)} px</div>
          </div>
    `;

      if (props.airVolume !== undefined) {
        html += `
          <div class="property-row">
            <div class="property-label">Объем воздуха:</div>
            <div class="property-value">${formatTo5(props.airVolume)} м³/с</div>
          </div>
        `;
      }

      html += `</div>`;
    });

    html += `</div>`;
  }

  if (linesStartingHere.length > 0) {
    html += `
      <div class="property-group">
        <h4>🟢 Линии, начинающиеся в точке:</h4>
    `;

    linesStartingHere.forEach((lineInfo, index) => {
      const line = lineInfo.line;
      normalizeLineProperties(line);
      const props = line.properties || {};
      const length = roundTo5(Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2)));

      html += `
        <div class="property-group" style="margin-top: 10px; border-left: 3px solid #00b894; padding-left: 10px; background: #f8f9fa; padding: 10px; border-radius: 4px;">
          <h5 style="margin: 5px 0;">${props.name || `Линия ${index + 1}`} (начало)</h5>
          
          <div class="property-row">
            <div class="property-label">Длина:</div>
            <div class="property-value">${formatTo5(length)} px</div>
          </div>
          <div class="property-row">
            <div class="property-label">Координаты:</div>
            <div class="property-value" style="font-size: 12px;">
              (${formatTo5(line.x1)}, ${formatTo5(line.y1)}) → (${formatTo5(line.x2)}, ${formatTo5(line.y2)})
            </div>
          </div>
          <div class="property-row">
            <div class="property-label">Воздушное сопротивление:</div>
            <div class="property-value"><strong>${formatTo5(props.airResistance || 0)}</strong></div>
          </div>
          <div class="property-row">
            <div class="property-label">Объем воздуха линии:</div>
            <div class="property-value"><strong>${formatTo5(props.airVolume || 0)} м³/с</strong></div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  if (linesEndingHere.length > 0) {
    html += `
      <div class="property-group">
        <h4>🔴 Линии, заканчивающиеся в точке:</h4>
    `;

    linesEndingHere.forEach((lineInfo, index) => {
      const line = lineInfo.line;
      normalizeLineProperties(line);
      const props = line.properties || {};
      const length = roundTo5(Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2)));

      html += `
        <div class="property-group" style="margin-top: 10px; border-left: 3px solid #e17055; padding-left: 10px; background: #f8f9fa; padding: 10px; border-radius: 4px;">
          <h5 style="margin: 5px 0;">${props.name || `Линия ${index + 1}`} (конец)</h5>
          
          <div class="property-row">
            <div class="property-label">Длина:</div>
            <div class="property-value">${formatTo5(length)} px</div>
          </div>
          <div class="property-row">
            <div class="property-label">Координаты:</div>
            <div class="property-value" style="font-size: 12px;">
              (${formatTo5(line.x1)}, ${formatTo5(line.y1)}) → (${formatTo5(line.x2)}, ${formatTo5(line.y2)})
            </div>
          </div>
          <div class="property-row">
            <div class="property-label">Воздушное сопротивление:</div>
            <div class="property-value"><strong>${formatTo5(props.airResistance || 0)}</strong></div>
          </div>
          <div class="property-row">
            <div class="property-label">Объем воздуха линии:</div>
            <div class="property-value"><strong>${formatTo5(props.airVolume || 0)} м³/с</strong></div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  // Кнопки действий
  html += `
    <div class="property-group" style="margin-top: 20px;">
      <h4>🚀 Действия:</h4>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button onclick="zoomToPoint(${pointIndex})" class="btn-small">
          🔍 Приблизить
        </button>
        <button onclick="selectObjectsAtPoint(${pointIndex})" class="btn-small">
          📌 Выбрать объекты
        </button>
        <button onclick="deleteIntersectionPoint(${pointIndex})" class="btn-small danger">
          🗑️ Удалить точку
        </button>
      </div>
    </div>
    
    <div class="property-group" style="margin-top: 20px;">
      <h4>🔄 Управление объемом воздуха:</h4>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button onclick="recalculateAirVolumeAtPoint(${pointIndex})" class="btn-small" style="background: #00b894;">
          🔄 Пересчитать в точке
        </button>
        <button onclick="calculateAirVolumesForAllLines()" class="btn-small" style="background: #0984e3;">
          🌐 Пересчитать все
        </button>
        <button onclick="toggleAirVolumeTexts()" class="btn-small" style="background: #6c5ce7;" id="toggleTextsBtn">
          👁️ Скрыть тексты
        </button>
      </div>
    </div>
  `;

  document.getElementById('intersectionPointInfo').innerHTML = html;
  document.getElementById('intersectionPointModal').style.display = 'flex';
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА ====================
window.zoomToPoint = function (pointIndex) {
  const pointData = intersectionPoints[pointIndex];
  if (!pointData) return;

  const zoomLevel = 2;
  canvas.setZoom(zoomLevel);
  const centerX = roundTo5(pointData.x - canvas.width / (2 * zoomLevel));
  const centerY = roundTo5(pointData.y - canvas.height / (2 * zoomLevel));
  canvas.absolutePan({x: -centerX, y: -centerY});

  showNotification('Приближено к точке', 'info');
  closeIntersectionPointModal();
};

window.selectObjectsAtPoint = function (pointIndex) {
  const pointData = intersectionPoints[pointIndex];
  if (!pointData) return;

  const allObjects = canvas.getObjects();
  const objectsToSelect = [];

  allObjects.forEach(obj => {
    if (obj.type === 'line') {
      const startDist = roundTo5(Math.sqrt(Math.pow(obj.x1 - pointData.x, 2) + Math.pow(obj.y1 - pointData.y, 2)));
      const endDist = roundTo5(Math.sqrt(Math.pow(obj.x2 - pointData.x, 2) + Math.pow(obj.y2 - pointData.y, 2)));
      if (startDist < 0.00001 || endDist < 0.00001) {
        objectsToSelect.push(obj);
      }
    } else if (obj.type === 'image' || obj.type === 'rect' || obj.type === 'circle') {
      const objRect = getObjectRect(obj);
      if (pointData.x >= objRect.left && pointData.x <= objRect.right &&
        pointData.y >= objRect.top && pointData.y <= objRect.bottom) {
        objectsToSelect.push(obj);
      }
    }
  });

  if (objectsToSelect.length > 0) {
    const selection = new fabric.ActiveSelection(objectsToSelect, {
      canvas: canvas
    });
    canvas.setActiveObject(selection);
    canvas.renderAll();
    showNotification(`Выбрано ${objectsToSelect.length} объектов`, 'success');
  } else {
    showNotification('Объектов не найдено', 'info');
  }

  closeIntersectionPointModal();
};

window.deleteIntersectionPoint = function (pointIndex) {
  if (!confirm('Удалить эту точку пересечения?')) return;

  const visual = intersectionVisuals[pointIndex];
  if (visual) {
    canvas.remove(visual.circle);
    canvas.remove(visual.text);
  }

  intersectionPoints.splice(pointIndex, 1);
  intersectionVisuals.splice(pointIndex, 1);

  // Обновляем индексы оставшихся точек
  intersectionVisuals.forEach((visual, idx) => {
    if (visual.circle) {
      visual.circle.set('pointIndex', idx);
      visual.text.set('text', (idx + 1).toString());
    }
  });

  canvas.renderAll();
  closeIntersectionPointModal();
  showNotification('Точка пересечения удалена', 'info');
};

// Функция для принудительного перерасчета объема воздуха в конкретной точке
window.recalculateAirVolumeAtPoint = function (pointIndex) {
  const pointData = intersectionPoints[pointIndex];
  if (!pointData) return;

  const allLines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  // Находим линии, связанные с этой точкой
  const linesAtPoint = allLines.filter(line => {
    const startDist = roundTo5(Math.sqrt(Math.pow(line.x1 - pointData.x, 2) + Math.pow(line.y1 - pointData.y, 2)));
    const endDist = roundTo5(Math.sqrt(Math.pow(line.x2 - pointData.x, 2) + Math.pow(line.y2 - pointData.y, 2)));
    return startDist < 0.00001 || endDist < 0.00001;
  });

  // Применяем принципы расчета
  let updated = false;

  // Принцип 1: Передача от объекта к линии
  if (pointData.object && pointData.object.properties &&
    pointData.object.properties.airVolume !== undefined) {

    linesAtPoint.forEach(line => {
      // Проверяем, начинается ли линия в этой точке
      const startDist = roundTo5(Math.sqrt(Math.pow(line.x1 - pointData.x, 2) + Math.pow(line.y1 - pointData.y, 2)));
      if (startDist < 0.00001) {
        if (!line.properties.airVolume || line.properties.airVolume !== pointData.object.properties.airVolume) {
          line.properties.airVolume = roundTo5(pointData.object.properties.airVolume);
          line.set('properties', line.properties);
          // createOrUpdateAirVolumeText(line);
          updated = true;
        }
      }
    });
  }

  // Принцип 2: Передача между линиями
  const linesEndingHere = linesAtPoint.filter(line => {
    const endDist = roundTo5(Math.sqrt(Math.pow(line.x2 - pointData.x, 2) + Math.pow(line.y2 - pointData.y, 2)));
    return endDist < 0.00001;
  });

  const linesStartingHere = linesAtPoint.filter(line => {
    const startDist = roundTo5(Math.sqrt(Math.pow(line.x1 - pointData.x, 2) + Math.pow(line.y1 - pointData.y, 2)));
    return startDist < 0.00001;
  });

  if (linesEndingHere.length === 1 && linesStartingHere.length === 1) {
    const endingLine = linesEndingHere[0];
    const startingLine = linesStartingHere[0];

    if (endingLine.properties && endingLine.properties.airVolume !== undefined) {
      if (!startingLine.properties.airVolume ||
        startingLine.properties.airVolume !== endingLine.properties.airVolume) {
        startingLine.properties.airVolume = roundTo5(endingLine.properties.airVolume);
        startingLine.set('properties', startingLine.properties);
        // createOrUpdateAirVolumeText(startingLine);
        updated = true;
      }
    }
  }

  if (updated) {
    canvas.renderAll();
    updatePropertiesPanel();
    showNotification('Объем воздуха пересчитан в точке', 'success');
    // Обновляем модальное окно
    showIntersectionPointInfo(pointIndex);
  } else {
    showNotification('Изменений не требуется', 'info');
  }
};

// Функция для показа/скрытия текстов объемов воздуха
window.toggleAirVolumeTexts = function () {
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  const btn = document.getElementById('toggleTextsBtn');
  const allTextsVisible = lines.every(line =>
    !line.airVolumeText || (line.airVolumeText && line.airVolumeText.visible)
  );

  lines.forEach(line => {
    if (line.airVolumeText) {
      line.airVolumeText.set('visible', !allTextsVisible);
    }
  });

  canvas.renderAll();

  if (allTextsVisible) {
    btn.innerHTML = '👁️ Показать тексты';
    showNotification('Тексты объемов воздуха скрыты', 'info');
  } else {
    btn.innerHTML = '👁️ Скрыть тексты';
    showNotification('Тексты объемов воздуха показаны', 'info');
  }
};

// ==================== ПАНЕЛЬ СВОЙСТВ ====================
function updatePropertiesPanel() {
  const activeObj = canvas.getActiveObject();
  const propsContent = document.getElementById('properties-content');

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
    const length = roundTo5(Math.sqrt(
      Math.pow(activeObj.x2 - activeObj.x1, 2) +
      Math.pow(activeObj.y2 - activeObj.y1, 2)
    ));
    content += `
            <div class="property-row">
                <div class="property-label">Длина:</div>
                <div class="property-value">${formatTo5(length)}px</div>
            </div>
        `;

    if (activeObj.properties) {
      normalizeLineProperties(activeObj);
      const props = activeObj.properties;

      content += `
                <div class="property-group">
                    <h4>📊 Технические параметры</h4>
                    <div class="property-row">
                        <div class="property-label">Название:</div>
                        <div class="property-value">${props.name || 'Без названия'}</div>
                    </div>
                    <div class="property-row">
                        <div class="property-label">Воздушное сопротивление:</div>
                        <div class="property-value"><strong>${formatTo5(props.airResistance || 0)}</strong></div>
                    </div>
                    <div class="property-row">
                        <div class="property-label">Объем воздуха:</div>
                        <div class="property-value"><strong>${formatTo5(props.airVolume || 0)} м³/с</strong></div>
                    </div>
                    ${activeObj.lineStartsFromObject && activeObj.startObject ? `
                    <div class="property-row">
                        <div class="property-label">Источник воздуха:</div>
                        <div class="property-value">${activeObj.startObject.properties?.name || 'Объект'}</div>
                    </div>
                    ` : ''}
                </div>
            `;
    }
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
        `;

    if (props.airVolume !== undefined && props.airVolume !== null) {
      content += `
                <div class="property-row">
                    <div class="property-label">Объем воздуха:</div>
                    <div class="property-value">${formatTo5(props.airVolume)} м³/с</div>
                </div>
            `;
    }
  }

  content += `</div>`;
  propsContent.innerHTML = content;
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
      statusText += ` (${formatTo5(length)}px)`;

      if (activeObj.properties && activeObj.properties.airResistance !== undefined) {
        statusText += ` | <strong>R:</strong> ${formatTo5(activeObj.properties.airResistance)}`;
      }

      if (activeObj.properties && activeObj.properties.airVolume !== undefined) {
        statusText += ` | <strong>Q:</strong> ${formatTo5(activeObj.properties.airVolume)} м³/с`;
      }
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
      if (currentEditingLine.startObject.properties &&
        currentEditingLine.startObject.properties.airVolume !== undefined) {
        airVolume = roundTo5(currentEditingLine.startObject.properties.airVolume);
        showNotification('Объем воздуха линии остается привязанным к объекту', 'info');
      } else {
        airVolume = roundTo5(parseFloat(airVolumeInput.value) || 0);
      }
    } else {
      airVolume = roundTo5(parseFloat(airVolumeInput.value) || 0);
    }
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

  // Обновляем текст объема воздуха для линии
  // createOrUpdateAirVolumeText(currentEditingLine);

  // Вызываем перерасчет объемов воздуха после изменения свойств линии
  setTimeout(() => {
    calculateAirVolumesForAllLines();
  }, 10);

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

    // Обновляем тексты объемов воздуха для всех линий, связанных с этим объектом
    const lines = canvas.getObjects().filter(obj =>
      obj.type === 'line' && obj.id !== 'grid-line'
    );

    lines.forEach(line => {
      if (line.lineStartsFromObject && line.startObject &&
        (line.startObject.id === currentEditingObject.id ||
          line.startObject._id === currentEditingObject._id)) {
        // createOrUpdateAirVolumeText(line);
      }
    });

    // Вызываем перерасчет объемов воздуха после изменения свойств объекта
    setTimeout(() => {
      calculateAirVolumesForAllLines();
    }, 10);

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

  // Если удаляем линию, удаляем и ее текст
  if (currentEditingObject.type === 'line') {
    removeAirVolumeText(currentEditingObject);
  }

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

function closeIntersectionPointModal() {
  document.getElementById('intersectionPointModal').style.display = 'none';
}

// ==================== ФУНКЦИЯ ДЛЯ ОТЧЕТА ОБ ОБЪЕМАХ ВОЗДУХА ====================
window.showAirVolumeReport = function () {
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  const images = canvas.getObjects().filter(obj =>
    obj.type === 'image' && obj.properties
  );

  let html = `
    <div class="property-group">
      <h4>📊 Отчет о передаче объемов воздуха</h4>
      <div class="property-row">
        <div class="property-label">Всего линий:</div>
        <div class="property-value">${lines.length}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Линии с объемом воздуха:</div>
        <div class="property-value">${lines.filter(l => l.properties && l.properties.airVolume !== undefined).length}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Объекты с объемом воздуха:</div>
        <div class="property-value">${images.filter(i => i.properties && i.properties.airVolume !== undefined).length}</div>
      </div>
    </div>
  `;

  // Информация об объектах-источниках
  const sourceObjects = images.filter(i => i.properties && i.properties.airVolume !== undefined);
  if (sourceObjects.length > 0) {
    html += `
      <div class="property-group">
        <h4>🎯 Объекты-источники:</h4>
    `;

    sourceObjects.forEach((obj, index) => {
      const connectedLines = lines.filter(line =>
        line.lineStartsFromObject && line.startObject &&
        (line.startObject.id === obj.id || line.startObject._id === obj._id)
      );

      html += `
        <div class="property-group" style="margin-top: 10px; background: #e8f6f3; padding: 10px; border-radius: 4px;">
          <div class="property-row">
            <div class="property-label">${obj.properties.name || `Объект ${index + 1}`}:</div>
            <div class="property-value"><strong>${formatTo5(obj.properties.airVolume)} м³/с</strong></div>
          </div>
          <div class="property-row">
            <div class="property-label">Подключенных линий:</div>
            <div class="property-value">${connectedLines.length}</div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  // Информация о линиях
  html += `
    <div class="property-group">
      <h4>📏 Линии и их объемы воздуха:</h4>
  `;

  lines.forEach((line, index) => {
    const airVolume = line.properties && line.properties.airVolume !== undefined
      ? formatTo5(line.properties.airVolume)
      : 'не задан';

    let sourceInfo = '';
    if (line.lineStartsFromObject && line.startObject) {
      sourceInfo = `← ${line.startObject.properties?.name || 'Объект'}`;
    }

    html += `
      <div class="property-group" style="margin-top: 5px; padding: 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid ${line.stroke || '#4A00E0'};">
        <div class="property-row">
          <div class="property-label">${line.properties?.name || `Линия ${index + 1}`}:</div>
          <div class="property-value">
            <strong>${airVolume} м³/с</strong>
            ${sourceInfo ? `<span style="margin-left: 10px; font-size: 12px; color: #7f8c8d;">${sourceInfo}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;

  // Кнопки действий
  html += `
    <div class="property-group" style="margin-top: 20px;">
      <h4>🚀 Действия:</h4>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button onclick="calculateAirVolumesForAllLines()" class="btn-small" style="background: #0984e3;">
          🔄 Пересчитать все
        </button>
        <button onclick="updateAllAirVolumeTexts()" class="btn-small" style="background: #00b894;">
          📝 Обновить тексты
        </button>
        <button onclick="closeAirVolumeReport()" class="btn-small">
          ✕ Закрыть
        </button>
      </div>
    </div>
  `;

  // Создаем новое модальное окно или используем существующее
  if (!document.getElementById('airVolumeReportModal')) {
    const modalHTML = `
      <div id="airVolumeReportModal" class="modal" style="display: flex;">
        <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
          <div class="modal-header">
            <h3>📊 Отчет о передаче объемов воздуха</h3>
            <span class="modal-close" onclick="closeAirVolumeReport()">&times;</span>
          </div>
          <div class="modal-body" id="airVolumeReportContent">
            ${html}
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  } else {
    document.getElementById('airVolumeReportContent').innerHTML = html;
    document.getElementById('airVolumeReportModal').style.display = 'flex';
  }
};

// Функция закрытия отчета
window.closeAirVolumeReport = function () {
  const modal = document.getElementById('airVolumeReportModal');
  if (modal) {
    modal.style.display = 'none';
  }
};

// Добавляем кнопку в интерфейс для вызова отчета
function addAirVolumeReportButton() {
  const controls = document.querySelector('.controls');
  if (controls) {
    const reportButton = document.createElement('button');
    reportButton.id = 'airVolumeReportBtn';
    reportButton.className = 'control-btn';
    reportButton.innerHTML = '<span>📊</span> Отчет воздуха';
    reportButton.onclick = window.showAirVolumeReport;
    controls.appendChild(reportButton);
  }
}

// ==================== УПРАВЛЕНИЕ ПРОЕКТОМ ====================
function saveDrawing() {
  const json = JSON.stringify(canvas.toJSON(['id', 'properties', 'pointIndex', 'pointData', 'lineStartsFromObject', 'startObject', 'airVolumeText']));
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
        drawGrid(APP_CONFIG.GRID_SIZE);

        canvas.loadFromJSON(json, function () {
          canvas.getObjects().forEach(obj => {
            if (obj.lineStartsFromObject && obj.properties?.startsFromObject?.objectId) {
              const startObject = canvas.getObjects().find(o =>
                (o.id === obj.properties.startsFromObject.objectId ||
                  o._id === obj.properties.startsFromObject.objectId)
              );
              if (startObject) {
                obj.startObject = startObject;

                if (startObject.properties && startObject.properties.airVolume !== undefined &&
                  startObject.properties.airVolume !== null && obj.properties) {
                  obj.properties.airVolume = roundTo5(startObject.properties.airVolume);
                }
              }
            }

            if (obj.type === 'line') {
              normalizeLineProperties(obj);
            }
          });

          // Обновляем тексты объемов воздуха для всех линий после загрузки
          setTimeout(() => {
            updateAllAirVolumeTexts();
            calculateAirVolumesForAllLines();
          }, 100);

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

// ==================== ОТМЕНА/ПОВТОР ====================
function saveToUndoStack() {
  const json = JSON.stringify(canvas.toJSON(['id', 'properties']));
  undoStack.push(json);
  redoStack = [];

  if (undoStack.length > APP_CONFIG.MAX_UNDO_STEPS) {
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
    // После отмены вызываем расчет объемов воздуха и обновление текстов
    setTimeout(() => {
      updateAllAirVolumeTexts();
      calculateAirVolumesForAllLines();
    }, 10);
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
    // После повтора вызываем расчет объемов воздуха и обновление текстов
    setTimeout(() => {
      updateAllAirVolumeTexts();
      calculateAirVolumesForAllLines();
    }, 10);
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

  if (undoBtn) {
    undoBtn.disabled = undoStack.length < 2;
  }
  if (redoBtn) {
    redoBtn.disabled = redoStack.length === 0;
  }
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

        // Удаляем текст объема воздуха, если удаляем линию
        if (activeObject.type === 'line') {
          removeAirVolumeText(activeObject);
        }

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
        if (event.altKey) {
          window.showAirVolumeReport();
        } else {
          calculateAirVolumesForAllLines();
        }
        break;
      case 't':
        event.preventDefault();
        if (event.altKey) {
          window.toggleAirVolumeTexts();
        }
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

  // Удаляем текст объема воздуха, если удаляем линию
  if (activeObject.type === 'line') {
    removeAirVolumeText(activeObject);
  }

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
    clone.left = roundTo5(clone.left + 20);
    clone.top = roundTo5(clone.top + 20);
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

// ==================== УВЕДОМЛЕНИЯ ====================
function showNotification(message, type = 'info', duration = 3000) {
  const container = document.getElementById('notificationContainer');
  if (!container) return;

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

// ==================== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ====================
function calculateAllPropertiesForAllLines() {
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  let updatedCount = 0;

  lines.forEach(line => {
    if (line.properties) {
      normalizeLineProperties(line);
      // createOrUpdateAirVolumeText(line);
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    canvas.renderAll();
    updatePropertiesPanel();
    showNotification(`Свойства рассчитаны для ${updatedCount} линий`, 'success');
  }
}

function exportLinePropertiesToCSV() {
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  if (lines.length === 0) {
    showNotification('Нет линий для экспорта', 'warning');
    return;
  }

  let csvContent = "Название,Длина (px),Длина прохода (м²),Коэфф. шероховатости,Площадь сечения (м),Периметр,W (кг/м),Воздушное сопротивление,Объем воздуха (м³/с),Цвет,Толщина\n";

  lines.forEach(line => {
    normalizeLineProperties(line);

    const props = line.properties || {};
    const length = roundTo5(Math.sqrt(
      Math.pow(line.x2 - line.x1, 2) +
      Math.pow(line.y2 - line.y1, 2)
    ));

    const name = (props.name || 'Без названия').replace(/"/g, '""');

    csvContent += `"${name}",${formatTo5(length)},${formatTo5(props.passageLength || 0)},${formatTo5(props.roughnessCoefficient || 0)},${formatTo5(props.crossSectionalArea || 0)},${formatTo5(props.perimeter || 0)},${formatTo5(props.W || 0)},${formatTo5(props.airResistance || 0)},${formatTo5(props.airVolume || 0)},"${line.stroke || APP_CONFIG.DEFAULT_LINE_COLOR}",${line.strokeWidth || 2}\n`;
  });

  const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `свойства-линий-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification(`Экспортировано ${lines.length} линий в CSV`, 'success');
}

// ==================== ЭКСПОРТ В PDF ====================
function exportToPDF() {
  showNotification('Начинается создание PDF...', 'info', 5000);

  const wasGridVisible = gridVisible;

  // Временно скрываем сетку для чистого экспорта
  if (wasGridVisible) {
    toggleGrid();
  }

  // Скрываем тексты объемов воздуха на время экспорта
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  const originalTextsVisibility = [];
  lines.forEach(line => {
    if (line.airVolumeText) {
      originalTextsVisibility.push({
        text: line.airVolumeText,
        visible: line.airVolumeText.visible
      });
      line.airVolumeText.visible = false;
    }
  });

  canvas.renderAll();

  // Получаем данные canvas
  const canvasElement = document.getElementById('fabric-canvas');

  // Создаем опции для экспорта
  const scale = 2;
  const width = canvasElement.width * scale;
  const height = canvasElement.height * scale;

  // Создаем временный canvas для рендеринга с высоким качеством
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');

  // Устанавливаем белый фон
  tempCtx.fillStyle = '#ffffff';
  tempCtx.fillRect(0, 0, width, height);

  // Рендерим оригинальный canvas на временный с увеличенным качеством
  tempCtx.drawImage(canvasElement, 0, 0, width, height);

  // Создаем PDF
  try {
    const {jsPDF} = window.jspdf;
    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height]
    });

    // Добавляем изображение в PDF
    const imgData = tempCanvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);

    // Добавляем метаданные
    pdf.setProperties({
      title: 'Технический чертеж',
      subject: 'Чертеж, созданный в редакторе',
      author: 'Редактор технических чертежей',
      keywords: 'чертеж, технический, редактор',
      creator: 'Редактор технических чертежей'
    });

    // Сохраняем PDF
    const fileName = `чертеж_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(fileName);

    showNotification('PDF успешно сохранен!', 'success');
  } catch (error) {
    console.error('Ошибка при создании PDF:', error);
    showNotification('Ошибка при создании PDF: ' + error.message, 'error');
  } finally {
    // Восстанавливаем исходное состояние
    if (wasGridVisible) {
      toggleGrid();
    }

    // Восстанавливаем видимость текстов
    originalTextsVisibility.forEach(item => {
      if (item.text && !item.text.isRemoved) {
        item.text.visible = item.visible;
      }
    });

    canvas.renderAll();
  }
}

// Альтернативный метод с использованием html2canvas (если нужны лучшие стили)
function exportToPDFWithHtml2Canvas() {
  showNotification('Создание PDF...', 'info', 5000);

  const wasGridVisible = gridVisible;

  // Скрываем сетку для экспорта
  if (wasGridVisible) {
    toggleGrid();
  }

  // Скрываем тексты объемов воздуха
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  const originalTextsVisibility = [];
  lines.forEach(line => {
    if (line.airVolumeText) {
      originalTextsVisibility.push({
        text: line.airVolumeText,
        visible: line.airVolumeText.visible
      });
      line.airVolumeText.visible = false;
    }
  });

  canvas.renderAll();

  // Используем html2canvas для захвата canvas с лучшим качеством
  const canvasWrapper = document.getElementById('canvas-wrapper');

  html2canvas(canvasWrapper, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    allowTaint: true
  }).then(capturedCanvas => {
    try {
      const {jsPDF} = window.jspdf;
      const imgWidth = 210;
      const imgHeight = (capturedCanvas.height * imgWidth) / capturedCanvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = capturedCanvas.toDataURL('image/png', 1.0);

      // Рассчитываем положение для центрирования
      const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;

      pdf.addImage(imgData, 'PNG', x, 10, imgWidth, imgHeight);

      // Добавляем заголовок
      pdf.setFontSize(16);
      pdf.text('Технический чертеж', 105, 5, {align: 'center'});

      // Добавляем дату
      pdf.setFontSize(10);
      pdf.text(`Дата создания: ${new Date().toLocaleDateString()}`, 105, 290, {align: 'center'});

      const fileName = `технический_чертеж_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);

      showNotification('PDF успешно сохранен в формате A4!', 'success');
    } catch (error) {
      console.error('Ошибка при создании PDF:', error);
      showNotification('Ошибка при создании PDF: ' + error.message, 'error');
    } finally {
      // Восстанавливаем исходное состояние
      if (wasGridVisible) {
        toggleGrid();
      }

      originalTextsVisibility.forEach(item => {
        if (item.text && !item.text.isRemoved) {
          item.text.visible = item.visible;
        }
      });

      canvas.renderAll();
    }
  }).catch(error => {
    console.error('Ошибка html2canvas:', error);
    showNotification('Ошибка при захвате изображения: ' + error.message, 'error');

    // Восстанавливаем исходное состояние
    if (wasGridVisible) {
      toggleGrid();
    }

    originalTextsVisibility.forEach(item => {
      if (item.text && !item.text.isRemoved) {
        item.text.visible = item.visible;
      }
    });

    canvas.renderAll();
  });
}

// Функция для экспорта с выбором формата
function exportToPDFWithOptions() {
  // Создаем модальное окно для выбора опций
  const modalHtml = `
    <div id="pdfExportModal" class="modal" style="display: flex;">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3>📄 Настройки экспорта в PDF</h3>
          <button class="close-modal" onclick="closePdfExportModal()">×</button>
        </div>
        <div class="modal-form" style="padding: 20px;">
          <div class="form-group">
            <label class="form-label">Качество:</label>
            <select id="pdfQuality" class="form-select">
              <option value="1">Стандартное</option>
              <option value="2" selected>Высокое</option>
              <option value="3">Максимальное</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Формат:</label>
            <select id="pdfFormat" class="form-select">
              <option value="A4">A4 (стандартный)</option>
              <option value="A3">A3 (большой)</option>
              <option value="original">Оригинальный размер</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">
              <input type="checkbox" id="includeGrid" checked>
              Включать сетку
            </label>
          </div>
          
          <div class="form-group">
            <label class="form-label">
              <input type="checkbox" id="includeAirVolumeText" checked>
              Включать тексты объемов воздуха
            </label>
          </div>
          
          <div class="form-group">
            <label class="form-label">
              <input type="checkbox" id="addMetadata" checked>
              Добавлять метаданные (дата, название)
            </label>
          </div>
          
          <div class="modal-buttons" style="margin-top: 20px;">
            <button class="btn btn-secondary" onclick="closePdfExportModal()">Отмена</button>
            <button class="btn btn-primary" onclick="startPdfExport()">Экспортировать</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Добавляем модальное окно на страницу
  if (!document.getElementById('pdfExportModal')) {
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  document.getElementById('pdfExportModal').style.display = 'flex';
}

function closePdfExportModal() {
  const modal = document.getElementById('pdfExportModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function startPdfExport() {
  closePdfExportModal();

  const quality = parseInt(document.getElementById('pdfQuality').value);
  const format = document.getElementById('pdfFormat').value;
  const includeGrid = document.getElementById('includeGrid').checked;
  const includeAirVolumeText = document.getElementById('includeAirVolumeText').checked;
  const addMetadata = document.getElementById('addMetadata').checked;

  exportToPDFAdvanced({
    quality: quality,
    format: format,
    includeGrid: includeGrid,
    includeAirVolumeText: includeAirVolumeText,
    addMetadata: addMetadata
  });
}

// Продвинутая функция экспорта с настройками
function exportToPDFAdvanced(options = {}) {
  const {
    quality = 2,
    format = 'A4',
    includeGrid = true,
    includeAirVolumeText = true,
    addMetadata = true
  } = options;

  showNotification(`Создание PDF (${format}, качество: ${quality}x)...`, 'info', 5000);

  // Сохраняем исходное состояние
  const wasGridVisible = gridVisible;

  // Управляем видимостью сетки
  if (!includeGrid && wasGridVisible) {
    toggleGrid();
  } else if (includeGrid && !wasGridVisible) {
    toggleGrid();
  }

  // Управляем видимостью текстов объемов воздуха
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  const originalTextsVisibility = [];
  lines.forEach(line => {
    if (line.airVolumeText) {
      originalTextsVisibility.push({
        text: line.airVolumeText,
        visible: line.airVolumeText.visible
      });
      line.airVolumeText.visible = includeAirVolumeText;
    }
  });

  canvas.renderAll();

  // Захватываем canvas с выбранным качеством
  const canvasElement = document.getElementById('fabric-canvas');
  const scale = quality;

  html2canvas(canvasElement, {
    scale: scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    allowTaint: true
  }).then(capturedCanvas => {
    // Объявляем переменные здесь, чтобы они были доступны в finally блоке
    let pageWidth = 210;
    let pageHeight = 297;

    try {
      const {jsPDF} = window.jspdf;
      let pdf;
      let imgWidth, imgHeight, x, y;

      if (format === 'original') {
        // Оригинальный размер
        const imgWidthMM = (capturedCanvas.width * 25.4) / 96;
        const imgHeightMM = (capturedCanvas.height * 25.4) / 96;

        pdf = new jsPDF({
          orientation: imgWidthMM > imgHeightMM ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [imgWidthMM, imgHeightMM]
        });

        pdf.addImage(capturedCanvas, 'PNG', 0, 0, imgWidthMM, imgHeightMM);
      } else {
        // Стандартные форматы
        const formatDimensions = {
          'A4': [210, 297],
          'A3': [297, 420]
        };

        [pageWidth, pageHeight] = formatDimensions[format] || [210, 297];
        pdf = new jsPDF('p', 'mm', format);

        // Рассчитываем размеры изображения для вписывания на страницу
        const margin = 20;
        const maxWidth = pageWidth - (2 * margin);
        const maxHeight = pageHeight - (2 * margin);

        const widthRatio = maxWidth / capturedCanvas.width;
        const heightRatio = maxHeight / capturedCanvas.height;
        const ratio = Math.min(widthRatio, heightRatio);

        imgWidth = capturedCanvas.width * ratio;
        imgHeight = capturedCanvas.height * ratio;

        // Центрируем изображение
        x = (pageWidth - imgWidth) / 2;
        y = (pageHeight - imgHeight) / 2;

        pdf.addImage(capturedCanvas, 'PNG', x, y, imgWidth, imgHeight);
      }

      // Добавляем метаданные если нужно
      if (addMetadata) {
        pdf.setProperties({
          title: 'Технический чертеж',
          subject: 'Чертеж, созданный в редакторе технических чертежей',
          author: 'Редактор технических чертежей',
          keywords: 'технический чертеж, редактор, CAD',
          creator: 'Редактор технических чертежей v1.0'
        });

        // Добавляем заголовок и дату
        if (format !== 'original') {
          pdf.setFontSize(12);
          pdf.setTextColor(100);
          pdf.text(`Чертеж создан: ${new Date().toLocaleString()}`, 10, 10);

          // Добавляем информацию о количестве объектов
          const objectCount = canvas.getObjects().filter(obj =>
            obj.id !== 'grid-group' && obj.id !== 'grid-line'
          ).length;
          pdf.text(`Объектов на чертеже: ${objectCount}`, pageWidth - 60, 10);
        }
      }

      // Сохраняем файл
      const fileName = `технический_чертеж_${format}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);

      showNotification(`PDF сохранен в формате ${format}!`, 'success');
    } catch (error) {
      console.error('Ошибка при создании PDF:', error);
      showNotification('Ошибка при создании PDF: ' + error.message, 'error');
    } finally {
      // Восстанавливаем исходное состояние
      if (wasGridVisible !== gridVisible) {
        toggleGrid();
      }

      originalTextsVisibility.forEach(item => {
        if (item.text && !item.text.isRemoved) {
          item.text.visible = item.visible;
        }
      });

      canvas.renderAll();
    }
  }).catch(error => {
    console.error('Ошибка html2canvas:', error);
    showNotification('Ошибка при захвате изображения: ' + error.message, 'error');

    // Восстанавливаем исходное состояние
    if (wasGridVisible !== gridVisible) {
      toggleGrid();
    }

    originalTextsVisibility.forEach(item => {
      if (item.text && !item.text.isRemoved) {
        item.text.visible = item.visible;
      }
    });

    canvas.renderAll();
  });
}

// Делаем функции доступными глобально
window.exportToPDF = exportToPDF;
window.exportToPDFWithOptions = exportToPDFWithOptions;
window.exportToPDFAdvanced = exportToPDFAdvanced;

// ==================== ПРЕДОТВРАЩЕНИЕ КОНТЕКСТНОГО МЕНЮ ====================
document.addEventListener('DOMContentLoaded', function () {
  const canvasElement = document.getElementById('fabric-canvas');
  if (canvasElement) {
    canvasElement.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
  }
});

// ==================== ОБРАБОТКА ОШИБОК CanvasTextBaseline ====================
window.addEventListener('error', function (e) {
  if (e.message.includes('CanvasTextBaseline') || e.message.includes('alphabetic')) {
    console.warn('CanvasTextBaseline error caught:', e);
    e.preventDefault();
  }
});