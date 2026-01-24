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

  showNotification(`Режим добавления: ${image.name}. Shift+клик для размещения`, 'info');
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

  showNotification(modeText + ' ESC для отмены.', 'info');
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

    // Автоматически разделяем линии
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

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
function setupCanvasEvents() {
  // События мыши
  canvas.on('mouse:down', function (options) {
    const pointer = canvas.getPointer(options.e);
    const gridSize = 20;

    // Добавление изображения по Shift+клик
    if (options.e.shiftKey && currentImageData) {
      addImageAtPosition(pointer.x, pointer.y);
      return;
    }

    // Рисование линии
    if (isDrawingLine) {
      let snappedX, snappedY;

      if (isContinuousLineMode && lastLineEndPoint) {
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
      } else {
        snappedX = snapToGrid(pointer.x, gridSize);
        snappedY = snapToGrid(pointer.y, gridSize);
      }

      if (!lineStartPoint) {
        lineStartPoint = { x: snappedX, y: snappedY };
        previewLine = new fabric.Line([
          lineStartPoint.x, lineStartPoint.y, snappedX, snappedY
        ], {
          stroke: '#4A00E0',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false
        });
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
            endPoint: { x: snappedX, y: snappedY }
          }
        });

        saveToUndoStack();
        canvas.add(finalLine);
        canvas.setActiveObject(finalLine);
        updatePropertiesPanel();

        lastLineEndPoint = { x: snappedX, y: snappedY };

        if (isContinuousLineMode) {
          lineStartPoint = { x: snappedX, y: snappedY };
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

    // Двойной клик по объекту для открытия свойств
    canvas.on('mouse:dblclick', function (options) {
      if (options.target) {
        canvas.setActiveObject(options.target);
        showObjectPropertiesModal();
      }
    });

    // Клик по объекту для выбора
    canvas.on('mouse:down', function (options) {
      if (options.target && !isDrawingLine && !currentImageData) {
        updatePropertiesPanel();
      }
    });

    // Контекстное меню (правая кнопка мыши)
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

    // Обновление превью линии
    if (isDrawingLine && lineStartPoint && previewLine) {
      const snappedX = snapToGrid(pointer.x, 20);
      const snappedY = snapToGrid(pointer.y, 20);
      previewLine.set({ x2: snappedX, y2: snappedY });
      previewLine.setCoords();
      canvas.requestRenderAll();
    }
  });

  // Выбор объектов
  canvas.on('selection:created', updatePropertiesPanel);
  canvas.on('selection:updated', updatePropertiesPanel);
  canvas.on('selection:cleared', updatePropertiesPanel);

  // Добавьте этот обработчик в конец функции
  canvas.on('object:added', function (e) {
    // Если добавлен не объект точки пересечения, поднимаем точки наверх
    if (e.target && e.target.id !== 'intersection-point' && e.target.id !== 'intersection-point-label') {
      setTimeout(() => {
        bringIntersectionPointsToFront();
      }, 10);
    }
  });
}

// ==================== ГОРЯЧИЕ КЛАВИШИ ====================
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function (event) {
    // ESC - отмена
    if (event.key === 'Escape') {
      deactivateAllModes();
      hideContextMenu();
    }

    // Delete - удаление
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

    // Сохранение и загрузка
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

    // Быстрые клавиши
    switch (event.key.toLowerCase()) {
      case 'l':
        event.preventDefault();
        activateLineDrawing();
        break;
      case 's':
        event.preventDefault();
        splitAllLines();
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

// Показать модальное окно свойств объекта
function showObjectPropertiesModal() {
  const activeObject = canvas.getActiveObject();
  if (!activeObject) {
    showNotification('Выберите объект для редактирования!', 'error');
    return;
  }

  currentEditingObject = activeObject;
  currentEditingObjectType = activeObject.type;
  const props = activeObject.properties || {};

  // Заполняем форму в зависимости от типа объекта
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

    // Показываем только нужные поля для изображений
    document.querySelectorAll('.form-group').forEach(el => el.style.display = 'block');
  } else if (activeObject.type === 'line') {
    // Для линий показываем специальную форму
    showLinePropertiesModal();
    return;
  } else {
    // Для других типов объектов
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

// Закрыть модальное окно свойств объекта
function closeObjectPropertiesModal() {
  document.getElementById('objectPropertiesModal').style.display = 'none';
  currentEditingObject = null;
  currentEditingObjectType = null;
}

// Применить свойства объекта
function applyObjectProperties() {
  if (!currentEditingObject) return;

  try {
    saveToUndoStack();

    const newProperties = {
      name: document.getElementById('objPropertyName').value.trim(),
      type: document.getElementById('objPropertyType').value,
      notes: document.getElementById('objPropertyNotes').value.trim() || null
    };

    // Парсим пользовательские данные
    const customDataText = document.getElementById('objPropertyCustomData').value.trim();
    if (customDataText) {
      try {
        newProperties.customData = JSON.parse(customDataText);
      } catch (e) {
        showNotification('Ошибка в JSON: ' + e.message, 'error');
        return;
      }
    }

    // Сохраняем существующие свойства
    const oldProps = currentEditingObject.properties || {};
    if (oldProps.imageId) newProperties.imageId = oldProps.imageId;
    if (oldProps.imagePath) newProperties.imagePath = oldProps.imagePath;
    if (oldProps.L !== undefined) newProperties.L = oldProps.L;
    if (oldProps.I !== undefined) newProperties.I = oldProps.I;
    if (oldProps.K !== undefined) newProperties.K = oldProps.K;
    if (oldProps.W !== undefined) newProperties.W = oldProps.W;
    if (oldProps.length !== undefined) newProperties.length = oldProps.length;

    // Применяем геометрические свойства
    const updates = {
      properties: newProperties,
      left: parseInt(document.getElementById('objPropertyX').value) || currentEditingObject.left,
      top: parseInt(document.getElementById('objPropertyY').value) || currentEditingObject.top,
      angle: parseInt(document.getElementById('objPropertyRotation').value) || 0,
      opacity: (parseInt(document.getElementById('objPropertyOpacity').value) || 100) / 100
    };

    // Для изображений применяем масштабирование
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

// Удалить текущий объект
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

// ==================== ОБНОВЛЕНИЕ ПАНЕЛИ СВОЙСТВ ====================
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
            <div class="property-label">K (м):</div>
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
    // Для других типов объектов
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

// Добавить свойство Notes ко всем объектам при сохранении
function saveDrawing() {
  // Сохраняем notes для всех объектов
  canvas.getObjects().forEach(obj => {
    if (obj.type !== 'image' && obj.properties && !obj.properties.notes) {
      obj.properties.notes = '';
    }
  });

  const json = JSON.stringify(canvas.toJSON(['id', 'properties', 'pointIndex', 'pointData']));
  localStorage.setItem('fabricDrawing', json);

  const blob = new Blob([json], { type: 'application/json' });
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

// ==================== ИНИЦИАЛИЗАЦИЯ МОДАЛЬНЫХ ОКОН ====================
// ==================== ИНИЦИАЛИЗАЦИЯ МОДАЛЬНЫХ ОКОН ====================
function initializeModals() {
  // Форма свойств линии
  document.getElementById('linePropertiesForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    applyLineProperties();
  });

  // Форма добавления изображения
  document.getElementById('addImageForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    addNewImage();
  });

  // Форма свойств объекта
  document.getElementById('objectPropertiesForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    applyObjectProperties();
  });

  // Обновление значения непрозрачности при движении ползунка
  const opacitySlider = document.getElementById('objPropertyOpacity');
  const opacityValue = document.getElementById('opacityValue');

  if (opacitySlider && opacityValue) {
    opacitySlider.addEventListener('input', function (e) {
      opacityValue.textContent = e.target.value + '%';
    });
  }

  // Закрытие модальных окон при клике вне их области
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

  // Закрытие по клавише ESC
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeLinePropertiesModal();
      closeAddImageModal();
      closeObjectPropertiesModal();
      closeIntersectionPointModal();
    }
  });
}

// ==================== СВОЙСТВА ОБЪЕКТОВ ====================
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
            <div class="property-label">K (м):</div>
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
        <button onclick="showLinePropertiesModal()" style="padding: 8px 16px; font-size: 13px;">
          ⚙️ Редактировать параметры
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
    `;
  }

  content += `</div>`;
  propsContent.innerHTML = content;
}

// ==================== МОДАЛЬНОЕ ОКНО СВОЙСТВ ЛИНИИ ====================
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

  // Сохраняем существующие свойства
  const oldProps = currentEditingLine.properties || {};
  if (oldProps.length) newProperties.length = oldProps.length;
  if (oldProps.startPoint) newProperties.startPoint = oldProps.startPoint;
  if (oldProps.endPoint) newProperties.endPoint = oldProps.endPoint;

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

// ==================== МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ ИЗОБРАЖЕНИЯ ====================
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

// ==================== ФУНКЦИИ РАЗДЕЛЕНИЯ ЛИНИЙ ====================
// Упрощенная функция разделения всех линий
function splitAllLines() {
  clearIntersectionPoints();

  const intersections = findAllIntersections();

  if (intersections.length === 0) {
    showNotification('Пересечений для разделения не найдено', 'info');
    return;
  }

  // Группируем пересечения по линиям
  const lineIntersections = new Map();
  const objectIntersections = new Map();

  intersections.forEach(inter => {
    if (inter.object) {
      if (!objectIntersections.has(inter.line1)) {
        objectIntersections.set(inter.line1, []);
      }
      objectIntersections.get(inter.line1).push(inter);
    } else if (inter.line1 && inter.line2) {
      if (!lineIntersections.has(inter.line1)) {
        lineIntersections.set(inter.line1, []);
      }
      if (!lineIntersections.has(inter.line2)) {
        lineIntersections.set(inter.line2, []);
      }

      lineIntersections.get(inter.line1).push({
        x: inter.x,
        y: inter.y,
        t: inter.ua || 0
      });

      lineIntersections.get(inter.line2).push({
        x: inter.x,
        y: inter.y,
        t: inter.ub || 0
      });
    }
  });

  let objectSplitCount = 0;
  let lineSplitCount = 0;

  // Обрабатываем пересечения с объектами
  objectIntersections.forEach((intersections, line) => {
    // Группируем по объектам
    const byObject = {};
    intersections.forEach(inter => {
      const objId = inter.object.id || inter.object._id;
      if (!byObject[objId]) byObject[objId] = [];
      byObject[objId].push(inter);
    });

    // Для каждого объекта находим точки входа и выхода
    Object.values(byObject).forEach(objIntersections => {
      const entryPoints = objIntersections.filter(i => i.type === 'entry');
      const exitPoints = objIntersections.filter(i => i.type === 'exit');

      if (entryPoints.length > 0 && exitPoints.length > 0) {
        // Находим ближайшую точку входа и самую дальнюю точку выхода
        entryPoints.sort((a, b) =>
          distance({ x: line.x1, y: line.y1 }, { x: a.x, y: a.y }) -
          distance({ x: line.x1, y: line.y1 }, { x: b.x, y: b.y })
        );

        exitPoints.sort((a, b) =>
          distance({ x: line.x1, y: line.y1 }, { x: b.x, y: b.y }) -
          distance({ x: line.x1, y: line.y1 }, { x: a.x, y: a.y })
        );

        const entryPoint = entryPoints[0];
        const exitPoint = exitPoints[0];

        // Разделяем линию
        const segments = [
          { start: { x: line.x1, y: line.y1 }, end: { x: entryPoint.x, y: entryPoint.y } },
          { start: { x: exitPoint.x, y: exitPoint.y }, end: { x: line.x2, y: line.y2 } }
        ];

        saveToUndoStack();
        canvas.remove(line);

        segments.forEach(segment => {
          const length = distance(segment.start, segment.end);
          if (length > 2) {
            const newLine = new fabric.Line([
              segment.start.x, segment.start.y,
              segment.end.x, segment.end.y
            ], {
              stroke: line.stroke,
              strokeWidth: line.strokeWidth,
              strokeDashArray: line.strokeDashArray,
              fill: false,
              strokeLineCap: 'round',
              hasControls: true,
              hasBorders: true,
              lockRotation: false,
              properties: { ...line.properties, length: length }
            });
            canvas.add(newLine);
            objectSplitCount++;
          }
        });
      }
    });
  });

  // Обрабатываем пересечения линий с линиями
  lineIntersections.forEach((points, line) => {
    points.sort((a, b) => a.t - b.t);

    // Удаляем дубликаты
    const uniquePoints = [];
    const seen = new Set();
    points.forEach(point => {
      const key = `${Math.round(point.x)}_${Math.round(point.y)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePoints.push(point);
      }
    });

    if (uniquePoints.length > 0) {
      // Создаем сегменты
      const segments = [];
      let currentStart = { x: line.x1, y: line.y1 };

      uniquePoints.forEach(point => {
        segments.push({
          start: currentStart,
          end: { x: point.x, y: point.y }
        });
        currentStart = { x: point.x, y: point.y };
      });

      segments.push({
        start: currentStart,
        end: { x: line.x2, y: line.y2 }
      });

      saveToUndoStack();
      canvas.remove(line);

      segments.forEach(segment => {
        const length = distance(segment.start, segment.end);
        if (length > 2) {
          const newLine = new fabric.Line([
            segment.start.x, segment.start.y,
            segment.end.x, segment.end.y
          ], {
            stroke: line.stroke,
            strokeWidth: line.strokeWidth,
            strokeDashArray: line.strokeDashArray,
            fill: false,
            strokeLineCap: 'round',
            hasControls: true,
            hasBorders: true,
            lockRotation: false,
            properties: { ...line.properties, length: length }
          });
          canvas.add(newLine);
          lineSplitCount++;
        }
      });
    }
  });

  // Создаем визуальные точки
  intersectionPoints = intersections;
  intersections.forEach((inter, index) => {
    if (!inter.object || (inter.object && lineSplitMode === 'AUTO')) {
      createIntersectionPoint(inter.x, inter.y, index, inter);
    }
  });

  bringIntersectionPointsToFront();
  canvas.renderAll();

  const totalSplits = objectSplitCount + lineSplitCount;
  if (totalSplits > 0) {
    showNotification(`Выполнено ${totalSplits} разделений (${objectSplitCount} по объектам, ${lineSplitCount} по линиям)`, 'success');
  }
}



// Функция для поиска пересечений
// Функция для определения пересечения двух отрезков
// Функция для определения пересечения двух отрезков
// Убедитесь, что функция lineIntersection (для линий с линиями) тоже использует допуски:
// Функция пересечения двух линий
function lineIntersection(line1, line2) {
  if (line1 === line2) return null;

  const intersection = getLineIntersection(
    { x: line1.x1, y: line1.y1 },
    { x: line1.x2, y: line1.y2 },
    { x: line2.x1, y: line2.y1 },
    { x: line2.x2, y: line2.y2 }
  );

  if (!intersection) return null;

  // Проверяем, что пересечение находится в пределах обоих отрезков
  const isOnLine1 = isPointOnSegment(intersection,
    { x: line1.x1, y: line1.y1 },
    { x: line1.x2, y: line1.y2 });
  const isOnLine2 = isPointOnSegment(intersection,
    { x: line2.x1, y: line2.y1 },
    { x: line2.x2, y: line2.y2 });

  if (isOnLine1 && isOnLine2) {
    // Вычисляем параметры t для обеих линий
    const line1Length = distance({ x: line1.x1, y: line1.y1 }, { x: line1.x2, y: line1.y2 });
    const line2Length = distance({ x: line2.x1, y: line2.y1 }, { x: line2.x2, y: line2.y2 });
    const t1 = distance({ x: line1.x1, y: line1.y1 }, intersection) / line1Length;
    const t2 = distance({ x: line2.x1, y: line2.y1 }, intersection) / line2Length;

    // Исключаем пересечения слишком близко к концам линий
    if (t1 < 0.02 || t1 > 0.98 || t2 < 0.02 || t2 > 0.98) {
      return null;
    }

    return {
      x: intersection.x,
      y: intersection.y,
      ua: t1,
      ub: t2,
      line1: line1,
      line2: line2
    };
  }

  return null;
}


// Поиск всех пересечений
// Поиск всех пересечений
// Поиск всех пересечений (включая линии с объектами)
// Обновленная функция поиска всех пересечений
// Нахождение всех пересечений
function findAllIntersections() {
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  const images = canvas.getObjects().filter(obj => obj.type === 'image');
  const intersections = [];

  // Пересечения линий с линиями
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const intersection = lineIntersection(lines[i], lines[j]);
      if (intersection) {
        intersections.push(intersection);
      }
    }
  }

  // Пересечения линий с объектами
  lines.forEach(line => {
    images.forEach(image => {
      if (doesLineIntersectObject(line, image)) {
        const rect = getObjectRect(image);
        const lineIntersections = getLineRectIntersections(line, rect);

        if (lineIntersections.length >= 2) {
          // Сортируем по расстоянию от начала линии
          lineIntersections.sort((a, b) => {
            const distA = distance({ x: line.x1, y: line.y1 }, a.point);
            const distB = distance({ x: line.x1, y: line.y1 }, b.point);
            return distA - distB;
          });

          intersections.push({
            x: lineIntersections[0].point.x,
            y: lineIntersections[0].point.y,
            line1: line,
            object: image,
            type: 'entry'
          });

          intersections.push({
            x: lineIntersections[lineIntersections.length - 1].point.x,
            y: lineIntersections[lineIntersections.length - 1].point.y,
            line1: line,
            object: image,
            type: 'exit'
          });
        }
      }
    });
  });

  return intersections;
}

// Получение границ объекта
// Улучшенная функция для получения границ объекта с учетом масштаба и вращения
// Получение точного прямоугольника объекта с учетом всех преобразований
function getObjectRect(obj) {
  if (!obj) return null;

  // Используем встроенный метод fabric для получения bounding box
  const boundingRect = obj.getBoundingRect();

  // Добавляем небольшой отступ для лучшего определения пересечений
  const padding = 2;
  return {
    left: boundingRect.left - padding,
    right: boundingRect.left + boundingRect.width + padding,
    top: boundingRect.top - padding,
    bottom: boundingRect.top + boundingRect.height + padding,
    width: boundingRect.width + padding * 2,
    height: boundingRect.height + padding * 2
  };
}

// Вспомогательная функция для расчета расстояния между точками
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Поиск пересечений линии с прямоугольником
// Поиск пересечений линии с прямоугольником - улучшенная версия
// Функция для определения пересечения отрезка с прямоугольником с учетом допусков
// Упрощенная и надежная функция поиска пересечения линии с прямоугольником
function getLineRectIntersections(line, rect) {
  const intersections = [];

  if (!line || !rect) return intersections;

  const lineStart = { x: line.x1, y: line.y1 };
  const lineEnd = { x: line.x2, y: line.y2 };

  // Проверяем пересечение с каждой стороной прямоугольника
  const sides = [
    { // Верхняя
      p1: { x: rect.left, y: rect.top },
      p2: { x: rect.right, y: rect.top }
    },
    { // Правая
      p1: { x: rect.right, y: rect.top },
      p2: { x: rect.right, y: rect.bottom }
    },
    { // Нижняя
      p1: { x: rect.right, y: rect.bottom },
      p2: { x: rect.left, y: rect.bottom }
    },
    { // Левая
      p1: { x: rect.left, y: rect.bottom },
      p2: { x: rect.left, y: rect.top }
    }
  ];

  sides.forEach(side => {
    const intersection = getLineIntersection(lineStart, lineEnd, side.p1, side.p2);
    if (intersection && isPointOnSegment(intersection, side.p1, side.p2)) {
      // Проверяем, что точка находится в пределах прямоугольника
      if (intersection.x >= rect.left - 1 && intersection.x <= rect.right + 1 &&
        intersection.y >= rect.top - 1 && intersection.y <= rect.bottom + 1) {

        // Исключаем точки слишком близко к концам линии
        const distToStart = distance(lineStart, intersection);
        const distToEnd = distance(lineEnd, intersection);

        if (distToStart > 1 && distToEnd > 1) {
          intersections.push({
            point: intersection,
            side: side,
            t: distToStart / (distToStart + distToEnd)
          });
        }
      }
    }
  });

  return intersections;
}

// Проверка, находится ли точка на отрезке
function isPointOnSegment(point, segStart, segEnd) {
  const minX = Math.min(segStart.x, segEnd.x);
  const maxX = Math.max(segStart.x, segEnd.x);
  const minY = Math.min(segStart.y, segEnd.y);
  const maxY = Math.max(segStart.y, segEnd.y);

  return point.x >= minX - 0.1 && point.x <= maxX + 0.1 &&
    point.y >= minY - 0.1 && point.y <= maxY + 0.1;
}

// Нахождение пересечения двух линий
function getLineIntersection(p1, p2, p3, p4) {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

  if (Math.abs(denom) < 0.000001) {
    return null; // Линии параллельны
  }

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y)
    };
  }

  return null;
}



// Вспомогательная функция для вычисления параметра t на линии (0 = начало, 1 = конец)
function calculateParameterOnLine(line, point) {
  const lineLength = Math.sqrt(
    Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2)
  );

  if (lineLength === 0) return 0;

  const distToStart = Math.sqrt(
    Math.pow(point.x - line.x1, 2) + Math.pow(point.y - line.y1, 2)
  );

  return distToStart / lineLength;
}

// Принудительное обновление всех пересечений
function refreshAllIntersections() {
  clearIntersectionPoints();
  intersectionPoints = findAllIntersections();

  intersectionPoints.forEach((inter, index) => {
    createIntersectionPoint(inter.x, inter.y, index, inter);
  });

  bringIntersectionPointsToFront();
  canvas.renderAll();

  if (intersectionPoints.length > 0) {
    showNotification(`Обновлено ${intersectionPoints.length} точек пересечения`, 'info');
  }
}

// Поднять все точки пересечения на передний план
function bringIntersectionPointsToFront() {
  intersectionVisuals.forEach(visual => {
    if (visual.circle && visual.text) {
      visual.circle.bringToFront();
      visual.text.bringToFront();
    }
  });
}

// Пересечение двух отрезков
// Улучшенная функция поиска пересечения двух отрезков
function lineSegmentIntersection(line1, line2) {
  const x1 = line1.x1, y1 = line1.y1;
  const x2 = line1.x2, y2 = line1.y2;
  const x3 = line2.p1.x, y3 = line2.p1.y;
  const x4 = line2.p2.x, y4 = line2.p2.y;

  // Вычисляем вектора
  const dx12 = x2 - x1;
  const dy12 = y2 - y1;
  const dx34 = x4 - x3;
  const dy34 = y4 - y3;

  // Знаменатель
  const denominator = dy34 * dx12 - dx34 * dy12;

  // Параллельны или совпадают
  if (Math.abs(denominator) < 0.000001) {
    return null;
  }

  // Вычисляем параметры
  const ua = (dx34 * (y1 - y3) - dy34 * (x1 - x3)) / denominator;
  const ub = (dx12 * (y1 - y3) - dy12 * (x1 - x3)) / denominator;

  // Проверяем, находится ли точка пересечения в пределах обоих отрезков
  // Используем допуск 0.00001 для учета численных ошибок
  const epsilon = 0.00001;
  if (ua >= -epsilon && ua <= 1 + epsilon && ub >= -epsilon && ub <= 1 + epsilon) {
    const x = x1 + ua * dx12;
    const y = y1 + ua * dy12;

    // Проверяем, не слишком ли близко к концам линий
    // Используем относительную позицию
    if (ua < 0.02 || ua > 0.98 || ub < 0.02 || ub > 0.98) {
      return null;
    }

    return { x: x, y: y };
  }

  return null;
}

// Создание визуальной точки разделения
// Создание визуальной точки разделения
function createIntersectionPoint(x, y, index, intersectionData) {
  const circle = new fabric.Circle({
    left: x - 6,
    top: y - 6,
    radius: 6,
    fill: '#ff4757',
    stroke: '#ff4757',
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
    fontSize: 32,
    fill: '#667eea',
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

  // Добавляем и сразу поднимаем на верхний слой
  canvas.add(circle);
  canvas.add(text);

  // ВАЖНО: поднимаем точку на передний план
  circle.bringToFront();
  text.bringToFront();

  intersectionVisuals.push({ circle, text });

  return circle;
}

// Разделение линий в точке
// Разделение линий в точке пересечения
function splitLinesAtPoint(intersection) {
  const results = [];

  // Разделяем первую линию
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

  // Разделяем вторую линию
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

// Разделение конкретной линии в точке
// Разделение конкретной линии в точке
function splitLineAtPoint(line, point) {
  // Вычисляем расстояния от точки до концов линии
  const dx1 = point.x - line.x1;
  const dy1 = point.y - line.y1;
  const dx2 = point.x - line.x2;
  const dy2 = point.y - line.y2;

  const distance1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  // Не разбиваем, если точка совпадает с концом линии (с учетом небольшого допуска)
  if (distance1 < 0.1 || distance2 < 0.1) {
    return null;
  }

  // Не разбиваем, если сегменты будут слишком короткими
  const totalLength = Math.sqrt(
    Math.pow(line.x2 - line.x1, 2) +
    Math.pow(line.y2 - line.y1, 2)
  );

  if (distance1 < 1 || distance2 < 1) {
    return null;
  }

  // Проверяем, что точка действительно лежит на линии
  // Используем параметрическое уравнение линии
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

  // Параметр точки на линии (0 = начало, 1 = конец)
  const t = dotProduct / lineLengthSquared;

  if (t < 0 || t > 1) {
    return null; // Точка не на линии
  }

  // Создаем первую часть линии
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
    properties: { ...line.properties }
  });

  // Создаем вторую часть линии
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
    properties: { ...line.properties }
  });

  // Обновляем длину в свойствах
  if (line1.properties) line1.properties.length = distance1;
  if (line2.properties) line2.properties.length = distance2;

  return { line1, line2 };
}

// Разделение линии по нескольким точкам сразу
function splitLineAtMultiplePoints(line, points) {
  if (!line || points.length === 0) return null;

  // Сортируем точки по расстоянию от начала линии
  points.sort((a, b) => {
    const distA = Math.sqrt(Math.pow(a.x - line.x1, 2) + Math.pow(a.y - line.y1, 2));
    const distB = Math.sqrt(Math.pow(b.x - line.x1, 2) + Math.pow(b.y - line.y1, 2));
    return distA - distB;
  });

  // Проверяем, что точки находятся на линии и не слишком близко к концам
  const validPoints = [];
  points.forEach(point => {
    // Проверяем, лежит ли точка на линии
    const lineVector = { x: line.x2 - line.x1, y: line.y2 - line.y1 };
    const pointVector = { x: point.x - line.x1, y: point.y - line.y1 };

    const dotProduct = lineVector.x * pointVector.x + lineVector.y * pointVector.y;
    const lineLengthSquared = lineVector.x * lineVector.x + lineVector.y * lineVector.y;
    const t = dotProduct / lineLengthSquared;

    // Проверяем, что точка действительно на отрезке и не слишком близко к концам
    if (t > 0.01 && t < 0.99) {
      const distance1 = Math.sqrt(Math.pow(point.x - line.x1, 2) + Math.pow(point.y - line.y1, 2));
      const distance2 = Math.sqrt(Math.pow(point.x - line.x2, 2) + Math.pow(point.y - line.y2, 2));

      if (distance1 > 5 && distance2 > 5) {
        validPoints.push(point);
      }
    }
  });

  if (validPoints.length === 0) return null;

  // Создаем сегменты
  const segments = [];
  let currentStart = { x: line.x1, y: line.y1 };

  validPoints.forEach((point, index) => {
    segments.push({
      start: currentStart,
      end: { x: point.x, y: point.y },
      isLast: index === validPoints.length - 1
    });
    currentStart = { x: point.x, y: point.y };
  });

  // Добавляем последний сегмент
  segments.push({
    start: currentStart,
    end: { x: line.x2, y: line.y2 },
    isLast: true
  });

  // Удаляем исходную линию
  saveToUndoStack();
  canvas.remove(line);

  // Создаем новые линии для каждого сегмента
  const newLines = [];

  segments.forEach(segment => {
    const length = Math.sqrt(
      Math.pow(segment.end.x - segment.start.x, 2) +
      Math.pow(segment.end.y - segment.start.y, 2)
    );

    // Пропускаем слишком короткие сегменты
    if (length < 2) return;

    const newLine = new fabric.Line([
      segment.start.x, segment.start.y,
      segment.end.x, segment.end.y
    ], {
      stroke: line.stroke,
      strokeWidth: line.strokeWidth,
      strokeDashArray: line.strokeDashArray,
      fill: false,
      strokeLineCap: 'round',
      hasControls: true,
      hasBorders: true,
      lockRotation: false,
      properties: { ...line.properties }
    });

    if (newLine.properties) {
      newLine.properties.length = length;
    }

    canvas.add(newLine);
    newLines.push(newLine);
  });

  return newLines;
}

// Разделение линий по изображению
// Разделение линий по изображению
// Разделение линий по изображению - исправленная версия
// Улучшенная функция разбиения линий по изображениям
// Упрощенная функция разделения линий по изображению
function splitLinesAtImagePosition(image) {
  const lines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  const rect = getObjectRect(image);
  if (!rect) return;

  let splitCount = 0;

  lines.forEach(line => {
    if (doesLineIntersectObject(line, image)) {
      const intersections = getLineRectIntersections(line, rect);

      if (intersections.length >= 2) {
        // Сортируем по расстоянию от начала линии
        intersections.sort((a, b) =>
          distance({ x: line.x1, y: line.y1 }, a.point) -
          distance({ x: line.x1, y: line.y1 }, b.point)
        );

        const entryPoint = intersections[0].point;
        const exitPoint = intersections[intersections.length - 1].point;

        // Разделяем линию
        const segments = [
          { start: { x: line.x1, y: line.y1 }, end: entryPoint },
          { start: exitPoint, end: { x: line.x2, y: line.y2 } }
        ];

        saveToUndoStack();
        canvas.remove(line);

        segments.forEach(segment => {
          const length = distance(segment.start, segment.end);
          if (length > 2) {
            const newLine = new fabric.Line([
              segment.start.x, segment.start.y,
              segment.end.x, segment.end.y
            ], {
              stroke: line.stroke,
              strokeWidth: line.strokeWidth,
              strokeDashArray: line.strokeDashArray,
              fill: false,
              strokeLineCap: 'round',
              hasControls: true,
              hasBorders: true,
              lockRotation: false,
              properties: { ...line.properties, length: length }
            });
            canvas.add(newLine);
            splitCount++;
          }
        });

        // Добавляем точки пересечения
        if (lineSplitMode !== 'MANUAL' || autoSplitMode) {
          const pointKey1 = `${Math.round(entryPoint.x)}_${Math.round(entryPoint.y)}`;
          const pointKey2 = `${Math.round(exitPoint.x)}_${Math.round(exitPoint.y)}`;

          if (!intersectionPoints.some(p =>
            `${Math.round(p.x)}_${Math.round(p.y)}` === pointKey1)) {
            createIntersectionPoint(entryPoint.x, entryPoint.y, intersectionPoints.length, {
              x: entryPoint.x,
              y: entryPoint.y,
              line1: line,
              object: image,
              type: 'entry'
            });
            intersectionPoints.push({
              x: entryPoint.x,
              y: entryPoint.y,
              line1: line,
              object: image,
              type: 'entry'
            });
          }

          if (!intersectionPoints.some(p =>
            `${Math.round(p.x)}_${Math.round(p.y)}` === pointKey2)) {
            createIntersectionPoint(exitPoint.x, exitPoint.y, intersectionPoints.length, {
              x: exitPoint.x,
              y: exitPoint.y,
              line1: line,
              object: image,
              type: 'exit'
            });
            intersectionPoints.push({
              x: exitPoint.x,
              y: exitPoint.y,
              line1: line,
              object: image,
              type: 'exit'
            });
          }
        }
      }
    }
  });

  if (splitCount > 0) {
    showNotification(`Разделено ${splitCount} линий по изображению`, 'success');
    bringIntersectionPointsToFront();
  }

  canvas.renderAll();
}

// Функция для проверки, пересекает ли линия объект (используется для быстрой проверки)
// Проверка, пересекает ли линия объект
function doesLineIntersectObject(line, object) {
  const rect = getObjectRect(object);
  if (!rect) return false;

  // Быстрая проверка по bounding box
  const lineBox = {
    left: Math.min(line.x1, line.x2),
    right: Math.max(line.x1, line.x2),
    top: Math.min(line.y1, line.y2),
    bottom: Math.max(line.y1, line.y2)
  };

  // Если bounding box не пересекаются, то и линии не пересекают
  if (lineBox.right < rect.left || lineBox.left > rect.right ||
    lineBox.bottom < rect.top || lineBox.top > rect.bottom) {
    return false;
  }

  // Детальная проверка пересечения
  const intersections = getLineRectIntersections(line, rect);
  return intersections.length >= 2;
}


function showIntersectionPointInfo(pointIndex) {
  const pointData = intersectionPoints[pointIndex];
  if (!pointData) return;

  const allLines = canvas.getObjects().filter(obj =>
    obj.type === 'line' && obj.id !== 'grid-line'
  );

  const allObjects = canvas.getObjects().filter(obj =>
    obj.type === 'image' || obj.type === 'rect' || obj.type === 'circle' || obj.type === 'triangle'
  );

  const linesStartingHere = [];
  const linesEndingHere = [];
  const objectsAtPoint = [];
  const threshold = 5;

  // Находим линии, начинающиеся/заканчивающиеся в точке
  allLines.forEach(line => {
    const startDist = Math.sqrt(Math.pow(line.x1 - pointData.x, 2) + Math.pow(line.y1 - pointData.y, 2));
    const endDist = Math.sqrt(Math.pow(line.x2 - pointData.x, 2) + Math.pow(line.y2 - pointData.y, 2));

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

  // Находим объекты в точке
  allObjects.forEach(obj => {
    const objRect = getObjectRect(obj);
    if (pointData.x >= objRect.left && pointData.x <= objRect.right &&
      pointData.y >= objRect.top && pointData.y <= objRect.bottom) {
      objectsAtPoint.push(obj);
    }
  });

  let html = `
    <div class="property-group">
      <h4>📌 Точка разделения #${pointIndex + 1}</h4>
      <div class="property-row">
        <div class="property-label">Координаты:</div>
        <div class="property-value">X: ${pointData.x.toFixed(1)}, Y: ${pointData.y.toFixed(1)}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Статистика:</div>
        <div class="property-value">
          🟢 ${linesStartingHere.length} начала | 🔴 ${linesEndingHere.length} окончаний | 🖼️ ${objectsAtPoint.length} объектов
        </div>
      </div>
      <div style="margin-top: 15px; text-align: center;">
        <button onclick="zoomToPoint(${pointData.x}, ${pointData.y})" style="padding: 6px 12px; font-size: 12px; margin: 2px;">
          🔍 Приблизить к точке
        </button>
        <button onclick="selectAllAtPoint(${pointIndex})" style="padding: 6px 12px; font-size: 12px; margin: 2px;">
          🎯 Выбрать все в точке
        </button>
        <button onclick="addNoteToPoint(${pointIndex})" style="padding: 6px 12px; font-size: 12px; margin: 2px;">
          📝 Добавить заметку
        </button>
      </div>
    </div>
  `;

  // Информация о самом пересечении
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
          <div class="property-value">${(pointData.ua * 100).toFixed(1)}% от начала</div>
        </div>
        ` : ''}
        ${pointData.ub !== undefined ? `
        <div class="property-row">
          <div class="property-label">Положение на линии 2:</div>
          <div class="property-value">${(pointData.ub * 100).toFixed(1)}% от начала</div>
        </div>
        ` : ''}
        <div style="margin-top: 10px; text-align: center;">
          <button onclick="editIntersectionPoint(${pointIndex})" style="padding: 6px 12px; font-size: 12px; background: #4A00E0; color: white; border: none; border-radius: 4px;">
            ⚙️ Редактировать пересечение
          </button>
        </div>
      </div>
    `;
  } else if (pointData.line1 && pointData.object) {
    html += `
      <div class="property-group">
        <h4>📐 Информация о пересечении:</h4>
        <div class="property-row">
          <div class="property-label">Тип:</div>
          <div class="property-value">Пересечение линии с объектом</div>
        </div>
      </div>
    `;
  }

  // Отображаем объекты в точке
  if (objectsAtPoint.length > 0) {
    html += `
      <div class="property-group">
        <h4>🖼️ Объекты в точке:</h4>
    `;

    objectsAtPoint.forEach((obj, index) => {
      const props = obj.properties || {};
      const notes = props.notes || 'Нет заметок';
      const customData = props.customData ? JSON.stringify(props.customData, null, 2) : 'Нет пользовательских данных';

      html += `
        <div class="property-group" style="margin-top: 10px; border-left: 3px solid #4A00E0; padding-left: 10px; background: #f8f9fa; padding: 10px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h5 style="margin: 5px 0;">${props.name || `Объект ${index + 1}`} (${obj.type})</h5>
            <button onclick="editObjectFromPoint('${obj.id || obj._id}', ${pointIndex})" 
                    style="padding: 4px 8px; font-size: 11px; background: #00b894; color: white; border: none; border-radius: 3px;">
              ⚙️ Редактировать
            </button>
          </div>
          
          <div class="property-row">
            <div class="property-label">Тип объекта:</div>
            <div class="property-value">${props.type || 'Не указан'}</div>
          </div>
          <div class="property-row">
            <div class="property-label">ID:</div>
            <div class="property-value">${props.imageId || obj.id || 'Не указан'}</div>
          </div>
          <div class="property-row">
            <div class="property-label">Размер:</div>
            <div class="property-value">${Math.round(obj.width * (obj.scaleX || 1))} × ${Math.round(obj.height * (obj.scaleY || 1))} px</div>
          </div>
          <div class="property-row">
            <div class="property-label">Позиция:</div>
            <div class="property-value">${Math.round(obj.left)} × ${Math.round(obj.top)} px</div>
          </div>
          <div class="property-row">
            <div class="property-label">Поворот:</div>
            <div class="property-value">${Math.round(obj.angle || 0)}°</div>
          </div>
          <div class="property-row">
            <div class="property-label">Непрозрачность:</div>
            <div class="property-value">${Math.round((obj.opacity || 1) * 100)}%</div>
          </div>
          ${props.L !== undefined ? `
          <div class="property-row">
            <div class="property-label">L (м²):</div>
            <div class="property-value">${props.L.toFixed(4)}</div>
          </div>
          ` : ''}
          ${props.I !== undefined ? `
          <div class="property-row">
            <div class="property-label">I:</div>
            <div class="property-value">${props.I.toFixed(6)}</div>
          </div>
          ` : ''}
          ${props.K !== undefined ? `
          <div class="property-row">
            <div class="property-label">K (м):</div>
            <div class="property-value">${props.K.toFixed(3)}</div>
          </div>
          ` : ''}
          ${props.W !== undefined ? `
          <div class="property-row">
            <div class="property-label">W (кг/м):</div>
            <div class="property-value">${props.W.toFixed(2)}</div>
          </div>
          ` : ''}
          ${notes !== 'Нет заметок' ? `
          <div class="property-row">
            <div class="property-label">Примечания:</div>
            <div class="property-value" style="font-style: italic; color: #666;">${notes}</div>
          </div>
          ` : ''}
          
          <div style="margin-top: 8px; font-size: 11px; color: #888;">
            <strong>Пользовательские данные:</strong>
            <pre style="background: white; padding: 5px; border-radius: 3px; max-height: 100px; overflow-y: auto; font-size: 10px;">${customData}</pre>
          </div>
          
          <div style="margin-top: 10px; display: flex; gap: 5px;">
            <button onclick="focusOnObject('${obj.id || obj._id}', ${pointIndex})" 
                    style="padding: 4px 8px; font-size: 10px; background: #0984e3; color: white; border: none; border-radius: 3px; flex: 1;">
              🔍 Сфокусировать
            </button>
            <button onclick="duplicateObjectFromPoint('${obj.id || obj._id}', ${pointIndex})" 
                    style="padding: 4px 8px; font-size: 10px; background: #fdcb6e; color: black; border: none; border-radius: 3px; flex: 1;">
              📋 Дублировать
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  // Отображаем линии, начинающиеся в точке
  if (linesStartingHere.length > 0) {
    html += `
      <div class="property-group">
        <h4>🟢 Линии, начинающиеся в точке:</h4>
    `;

    linesStartingHere.forEach((lineInfo, index) => {
      const line = lineInfo.line;
      const props = line.properties || {};
      const length = Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2));
      const notes = props.notes || 'Нет заметок';
      const customData = props.customData ? JSON.stringify(props.customData, null, 2) : 'Нет пользовательских данных';

      html += `
        <div class="property-group" style="margin-top: 10px; border-left: 3px solid #00b894; padding-left: 10px; background: #f8f9fa; padding: 10px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h5 style="margin: 5px 0;">${props.name || `Линия ${index + 1}`} (начало)</h5>
            <button onclick="editLineFromPoint('${line.id || line._id}', ${pointIndex})" 
                    style="padding: 4px 8px; font-size: 11px; background: #00b894; color: white; border: none; border-radius: 3px;">
              ⚙️ Редактировать
            </button>
          </div>
          
          <div class="property-row">
            <div class="property-label">ID линии:</div>
            <div class="property-value">${line.id || line._id || 'Не указан'}</div>
          </div>
          <div class="property-row">
            <div class="property-label">Длина:</div>
            <div class="property-value">${length.toFixed(1)} px</div>
          </div>
          <div class="property-row">
            <div class="property-label">Координаты:</div>
            <div class="property-value" style="font-size: 12px;">
              (${line.x1.toFixed(1)}, ${line.y1.toFixed(1)}) → (${line.x2.toFixed(1)}, ${line.y2.toFixed(1)})
            </div>
          </div>
          <div class="property-row">
            <div class="property-label">Цвет:</div>
            <div class="property-value">
              <span style="display: inline-block; width: 12px; height: 12px; background-color: ${line.stroke}; border: 1px solid #ccc; vertical-align: middle; margin-right: 5px;"></span>
              ${line.stroke}
            </div>
          </div>
          <div class="property-row">
            <div class="property-label">Толщина:</div>
            <div class="property-value">${line.strokeWidth} px</div>
          </div>
          <div class="property-row">
            <div class="property-label">Стиль:</div>
            <div class="property-value">${line.strokeDashArray ? 'Пунктирная' : 'Сплошная'}</div>
          </div>
          <div class="property-row">
            <div class="property-label">L (м²):</div>
            <div class="property-value">${(props.L || 0).toFixed(4)}</div>
          </div>
          <div class="property-row">
            <div class="property-label">I:</div>
            <div class="property-value">${(props.I || 0).toFixed(6)}</div>
          </div>
          <div class="property-row">
            <div class="property-label">K (м):</div>
            <div class="property-value">${(props.K || 0).toFixed(3)}</div>
          </div>
          <div class="property-row">
            <div class="property-label">W (кг/м):</div>
            <div class="property-value">${(props.W || 0).toFixed(2)}</div>
          </div>
          ${notes !== 'Нет заметок' ? `
          <div class="property-row">
            <div class="property-label">Примечания:</div>
            <div class="property-value" style="font-style: italic; color: #666;">${notes}</div>
          </div>
          ` : ''}
          
          <div style="margin-top: 8px; font-size: 11px; color: #888;">
            <strong>Пользовательские данные:</strong>
            <pre style="background: white; padding: 5px; border-radius: 3px; max-height: 100px; overflow-y: auto; font-size: 10px;">${customData}</pre>
          </div>
          
          <div style="margin-top: 10px; display: flex; gap: 5px;">
            <button onclick="focusOnObject('${line.id || line._id}', ${pointIndex})" 
                    style="padding: 4px 8px; font-size: 10px; background: #0984e3; color: white; border: none; border-radius: 3px; flex: 1;">
              🔍 Сфокусировать
            </button>
            <button onclick="splitLineAtThisPoint('${line.id || line._id}', ${pointIndex}, ${pointData.x}, ${pointData.y})" 
                    style="padding: 4px 8px; font-size: 10px; background: #e17055; color: white; border: none; border-radius: 3px; flex: 1;">
              ✂️ Разделить здесь
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  // Отображаем линии, заканчивающиеся в точке
  if (linesEndingHere.length > 0) {
    html += `
      <div class="property-group">
        <h4>🔴 Линии, заканчивающиеся в точке:</h4>
    `;

    linesEndingHere.forEach((lineInfo, index) => {
      const line = lineInfo.line;
      const props = line.properties || {};
      const length = Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2));
      const notes = props.notes || 'Нет заметок';
      const customData = props.customData ? JSON.stringify(props.customData, null, 2) : 'Нет пользовательских данных';

      html += `
        <div class="property-group" style="margin-top: 10px; border-left: 3px solid #e17055; padding-left: 10px; background: #f8f9fa; padding: 10px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h5 style="margin: 5px 0;">${props.name || `Линия ${index + 1}`} (конец)</h5>
            <button onclick="editLineFromPoint('${line.id || line._id}', ${pointIndex})" 
                    style="padding: 4px 8px; font-size: 11px; background: #e17055; color: white; border: none; border-radius: 3px;">
              ⚙️ Редактировать
            </button>
          </div>
          
          <div class="property-row">
            <div class="property-label">ID линии:</div>
            <div class="property-value">${line.id || line._id || 'Не указан'}</div>
          </div>
          <div class="property-row">
            <div class="property-label">Длина:</div>
            <div class="property-value">${length.toFixed(1)} px</div>
          </div>
          <div class="property-row">
            <div class="property-label">Координаты:</div>
            <div class="property-value" style="font-size: 12px;">
              (${line.x1.toFixed(1)}, ${line.y1.toFixed(1)}) → (${line.x2.toFixed(1)}, ${line.y2.toFixed(1)})
            </div>
          </div>
          <div class="property-row">
            <div class="property-label">Цвет:</div>
            <div class="property-value">
              <span style="display: inline-block; width: 12px; height: 12px; background-color: ${line.stroke}; border: 1px solid #ccc; vertical-align: middle; margin-right: 5px;"></span>
              ${line.stroke}
            </div>
          </div>
          <div class="property-row">
            <div class="property-label">Толщина:</div>
            <div class="property-value">${line.strokeWidth} px</div>
          </div>
          <div class="property-row">
            <div class="property-label">Стиль:</div>
            <div class="property-value">${line.strokeDashArray ? 'Пунктирная' : 'Сплошная'}</div>
          </div>
          <div class="property-row">
            <div class="property-label">L (м²):</div>
            <div class="property-value">${(props.L || 0).toFixed(4)}</div>
          </div>
          <div class="property-row">
            <div class="property-label">I:</div>
            <div class="property-value">${(props.I || 0).toFixed(6)}</div>
          </div>
          <div class="property-row">
            <div class="property-label">K (м):</div>
            <div class="property-value">${(props.K || 0).toFixed(3)}</div>
          </div>
          <div class="property-row">
            <div class="property-label">W (кг/м):</div>
            <div class="property-value">${(props.W || 0).toFixed(2)}</div>
          </div>
          ${notes !== 'Нет заметок' ? `
          <div class="property-row">
            <div class="property-label">Примечания:</div>
            <div class="property-value" style="font-style: italic; color: #666;">${notes}</div>
          </div>
          ` : ''}
          
          <div style="margin-top: 8px; font-size: 11px; color: #888;">
            <strong>Пользовательские данные:</strong>
            <pre style="background: white; padding: 5px; border-radius: 3px; max-height: 100px; overflow-y: auto; font-size: 10px;">${customData}</pre>
          </div>
          
          <div style="margin-top: 10px; display: flex; gap: 5px;">
            <button onclick="focusOnObject('${line.id || line._id}', ${pointIndex})" 
                    style="padding: 4px 8px; font-size: 10px; background: #0984e3; color: white; border: none; border-radius: 3px; flex: 1;">
              🔍 Сфокусировать
            </button>
            <button onclick="splitLineAtThisPoint('${line.id || line._id}', ${pointIndex}, ${pointData.x}, ${pointData.y})" 
                    style="padding: 4px 8px; font-size: 10px; background: #e17055; color: white; border: none; border-radius: 3px; flex: 1;">
              ✂️ Разделить здесь
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  document.getElementById('intersectionPointInfo').innerHTML = html;
  document.getElementById('intersectionPointModal').style.display = 'flex';

  // Определяем вспомогательные функции для кнопок
  window.zoomToPoint = function (x, y) {
    const zoomLevel = 2;
    canvas.setZoom(zoomLevel);
    const centerX = x - canvas.width / (2 * zoomLevel);
    const centerY = y - canvas.height / (2 * zoomLevel);
    canvas.absolutePan({ x: -centerX, y: -centerY });
    showNotification('Приближено к точке', 'info');
  };

  window.selectAllAtPoint = function (pointIndex) {
    const pointData = intersectionPoints[pointIndex];
    const allObjects = canvas.getObjects();
    const objectsToSelect = [];

    allObjects.forEach(obj => {
      if (obj.type === 'line') {
        const startDist = Math.sqrt(Math.pow(obj.x1 - pointData.x, 2) + Math.pow(obj.y1 - pointData.y, 2));
        const endDist = Math.sqrt(Math.pow(obj.x2 - pointData.x, 2) + Math.pow(obj.y2 - pointData.y, 2));
        if (startDist < 5 || endDist < 5) {
          objectsToSelect.push(obj);
        }
      } else if (obj.type === 'image' || obj.type === 'rect' || obj.type === 'circle' || obj.type === 'triangle') {
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
  };

  window.addNoteToPoint = function (pointIndex) {
    const pointData = intersectionPoints[pointIndex];
    const note = prompt('Добавьте заметку к точке пересечения:', pointData.notes || '');

    if (note !== null) {
      pointData.notes = note;
      // Обновляем визуальный элемент точки
      const visual = intersectionVisuals[pointIndex];
      if (visual && visual.circle) {
        visual.circle.set('pointData', pointData);
      }
      showNotification('Заметка добавлена', 'success');
      // Перезагружаем информацию о точке
      showIntersectionPointInfo(pointIndex);
    }
  };

  window.editIntersectionPoint = function (pointIndex) {
    const pointData = intersectionPoints[pointIndex];
    const newX = prompt('Новая координата X:', pointData.x);
    const newY = prompt('Новая координата Y:', pointData.y);

    if (newX !== null && newY !== null) {
      const oldX = pointData.x;
      const oldY = pointData.y;
      pointData.x = parseFloat(newX);
      pointData.y = parseFloat(newY);

      // Обновляем визуальную точку
      const visual = intersectionVisuals[pointIndex];
      if (visual && visual.circle && visual.text) {
        visual.circle.set({
          left: pointData.x - 6,
          top: pointData.y - 6
        });
        visual.text.set({
          left: pointData.x,
          top: pointData.y
        });
        canvas.renderAll();
      }

      showNotification(`Точка перемещена: (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) → (${pointData.x.toFixed(1)}, ${pointData.y.toFixed(1)})`, 'success');
      showIntersectionPointInfo(pointIndex);
    }
  };

  window.editLineFromPoint = function (lineId, pointIndex) {
    const line = canvas.getObjects().find(obj => (obj.id === lineId || obj._id === lineId) && obj.type === 'line');
    if (line) {
      closeIntersectionPointModal();
      canvas.setActiveObject(line);
      canvas.renderAll();

      setTimeout(() => {
        if (line.properties && line.properties.name) {
          showLinePropertiesModal();
        } else {
          showObjectPropertiesModal();
        }
      }, 100);
    } else {
      showNotification('Линия не найдена', 'error');
    }
  };

  window.editObjectFromPoint = function (objectId, pointIndex) {
    const object = canvas.getObjects().find(obj => (obj.id === objectId || obj._id === objectId) && obj.type !== 'line');
    if (object) {
      closeIntersectionPointModal();
      canvas.setActiveObject(object);
      canvas.renderAll();

      setTimeout(() => {
        showObjectPropertiesModal();
      }, 100);
    } else {
      showNotification('Объект не найден', 'error');
    }
  };

  window.focusOnObject = function (objectId, pointIndex) {
    const object = canvas.getObjects().find(obj => obj.id === objectId || obj._id === objectId);
    if (object) {
      canvas.setActiveObject(object);
      canvas.renderAll();

      // Центрируем камеру на объекте
      const zoomLevel = 2;
      canvas.setZoom(zoomLevel);
      const centerX = object.left - canvas.width / (2 * zoomLevel);
      const centerY = object.top - canvas.height / (2 * zoomLevel);
      canvas.absolutePan({ x: -centerX, y: -centerY });

      showNotification('Объект выделен и приближен', 'success');
    }
  };

  window.duplicateObjectFromPoint = function (objectId, pointIndex) {
    const object = canvas.getObjects().find(obj => obj.id === objectId || obj._id === objectId);
    if (object) {
      saveToUndoStack();
      object.clone(function (clone) {
        clone.left += 20;
        clone.top += 20;
        if (clone.id) delete clone.id;
        canvas.add(clone);
        canvas.setActiveObject(clone);
        canvas.renderAll();
        showNotification('Объект дублирован', 'success');
        showIntersectionPointInfo(pointIndex);
      });
    }
  };

  window.splitLineAtThisPoint = function (lineId, pointIndex, x, y) {
    const line = canvas.getObjects().find(obj => (obj.id === lineId || obj._id === lineId) && obj.type === 'line');
    if (line) {
      const splitResult = splitLineAtPoint(line, { x, y });
      if (splitResult) {
        saveToUndoStack();
        canvas.remove(line);
        canvas.add(splitResult.line1);
        canvas.add(splitResult.line2);
        canvas.renderAll();

        // Обновляем точки пересечения
        setTimeout(() => {
          clearIntersectionPoints();
          const intersections = findAllIntersections();
          intersectionPoints = intersections;
          intersections.forEach((inter, idx) => {
            createIntersectionPoint(inter.x, inter.y, idx, inter);
          });
          bringIntersectionPointsToFront();
        }, 50);

        showNotification('Линия разделена в точке', 'success');
        showIntersectionPointInfo(pointIndex);
      } else {
        showNotification('Не удалось разделить линию', 'error');
      }
    }
  };
}

function closeIntersectionPointModal() {
  document.getElementById('intersectionPointModal').style.display = 'none';
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

// ==================== СОХРАНЕНИЕ И ЗАГРУЗКА ====================
function saveDrawing() {
  const json = JSON.stringify(canvas.toJSON(['id', 'properties']));
  localStorage.setItem('fabricDrawing', json);

  const blob = new Blob([json], { type: 'application/json' });
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
function showNotification(message, type = 'info') {
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
  }, 3000);
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