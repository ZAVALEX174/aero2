console.log("06/02/2026 21:50");

// function calcLine(line, img) {

// };

console.log("07/02/2026 10-30 - Версия с неразрывными соединениями линий - ФИНАЛЬНАЯ");
// ==================== КОНСТАНТЫ И ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
const APP_CONFIG = {
	GRID_SIZE: 20,
	SNAP_RADIUS: 15,
	MAX_UNDO_STEPS: 50,
	DEFAULT_LINE_COLOR: '#4A00E0',
	DEFAULT_LINE_WIDTH: 5,
	MAX_IMAGE_SIZE: 40,
	NODE_THRESHOLD: 5,
	NODE_LOCK_DEFAULT: true
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
let isDraggingNode = false;
let draggedNodeKey = null;
let affectedLines = [];
let nodeLockEnabled = APP_CONFIG.NODE_LOCK_DEFAULT;

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

// Фикс для Chrome CanvasTextBaseline
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
			calculateAirVolumesForAllLines(true);
		} else {
			showNotification('Расчет уже выполняется, подождите...', 'warning');
		}
	});

	document.getElementById('analyzePointsBtn')?.addEventListener('click', function () {
		console.log('=== ЗАПУСК АНАЛИЗА ТОЧЕК ПЕРЕСЕЧЕНИЯ ===');
		analyzeIntersectionPoints();
	});

	window.addEventListener('resize', handleResize);
	console.log('Редактор технических чертежей загружен!');
});

function initializeCanvas() {
	canvas = new fabric.Canvas('fabric-canvas', {
		backgroundColor: '#ffffff',
		preserveObjectStacking: true,
		selection: true,
		selectionColor: 'rgba(74, 0, 224, 0.3)',
		selectionBorderColor: '#4A00E0',
		selectionLineWidth: 2,
		renderOnAddRemove: true
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

	canvas.setDimensions({ width, height });

	if (gridVisible) {
		drawGrid(APP_CONFIG.GRID_SIZE);
	}
	canvas.renderAll();
}

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

// ==================== ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ УЗЛАМИ ====================
function buildConnectionGraph() {
	connectionNodes.clear();
	const lines = canvas.getObjects().filter(obj =>
		obj.type === 'line' && obj.id !== 'grid-line' && !obj.isPreview
	);

	console.log(`Построение графа для ${lines.length} линий`);

	lines.forEach(line => {
		const startKey = `${roundTo5(line.x1)}_${roundTo5(line.y1)}`;
		const endKey = `${roundTo5(line.x2)}_${roundTo5(line.y2)}`;

		if (!connectionNodes.has(startKey)) {
			connectionNodes.set(startKey, {
				x: roundTo5(line.x1),
				y: roundTo5(line.y1),
				lines: [],
				locked: nodeLockEnabled
			});
		}

		const startNode = connectionNodes.get(startKey);
		if (!startNode.lines.some(l => l.line.id === line.id)) {
			startNode.lines.push({
				line: line,
				isStart: true,
				originalX: roundTo5(line.x1),
				originalY: roundTo5(line.y1)
			});
		}

		if (!connectionNodes.has(endKey)) {
			connectionNodes.set(endKey, {
				x: roundTo5(line.x2),
				y: roundTo5(line.y2),
				lines: [],
				locked: nodeLockEnabled
			});
		}

		const endNode = connectionNodes.get(endKey);
		if (!endNode.lines.some(l => l.line.id === line.id)) {
			endNode.lines.push({
				line: line,
				isStart: false,
				originalX: roundTo5(line.x2),
				originalY: roundTo5(line.y2)
			});
		}
	});

	for (const [key, node] of connectionNodes.entries()) {
		if (node.lines.length <= 1) {
			connectionNodes.delete(key);
		}
	}

	console.log(`Построено ${connectionNodes.size} узлов соединений`);
	return connectionNodes;
}

function drawConnectionNodes() {
	canvas.getObjects()
		.filter(obj => obj.id === 'node-marker' || obj.id === 'node-marker-text')
		.forEach(obj => canvas.remove(obj));

	connectionNodes.forEach((node, key) => {
		if (node.lines.length >= 2) {
			const circle = new fabric.Circle({
				left: node.x - 10,
				top: node.y - 10,
				radius: 10,
				fill: node.locked ? 'rgba(33, 150, 243, 0.8)' : 'rgba(255, 152, 0, 0.8)',
				stroke: node.locked ? '#2196F3' : '#FF9800',
				strokeWidth: 2,
				selectable: false,
				evented: true,
				id: 'node-marker',
				originX: 'center',
				originY: 'center',
				hoverCursor: 'move',
				nodeKey: key
			});

			const text = new fabric.Text(node.lines.length.toString(), {
				left: node.x,
				top: node.y,
				fontSize: 10,
				fill: 'white',
				fontWeight: 'bold',
				originX: 'center',
				originY: 'center',
				selectable: false,
				evented: false,
				id: 'node-marker-text'
			});

			circle.on('mousedown', function (e) {
				e.e.preventDefault();
				e.e.stopPropagation();
				startNodeDrag(key, e.e.clientX, e.e.clientY);
			});

			canvas.add(circle);
			canvas.add(text);
		}
	});

	bringIntersectionPointsToFront();
	bringNodeMarkersToFront();
}

function bringNodeMarkersToFront() {
	canvas.getObjects()
		.filter(obj => obj.id === 'node-marker' || obj.id === 'node-marker-text')
		.forEach(obj => obj.bringToFront());
}

function startNodeDrag(nodeKey, clientX, clientY) {
	if (!connectionNodes.has(nodeKey)) return;

	const node = connectionNodes.get(nodeKey);
	if (node.lines.length < 2) return;

	isDraggingNode = true;
	draggedNodeKey = nodeKey;
	affectedLines = [...node.lines];

	affectedLines.forEach(lineInfo => {
		if (!lineInfo.line.originalPositions) {
			lineInfo.line.originalPositions = {};
		}
		if (lineInfo.isStart) {
			lineInfo.line.originalPositions.x1 = lineInfo.line.x1;
			lineInfo.line.originalPositions.y1 = lineInfo.line.y1;
		} else {
			lineInfo.line.originalPositions.x2 = lineInfo.line.x2;
			lineInfo.line.originalPositions.y2 = lineInfo.line.y2;
		}
	});

	canvas.defaultCursor = 'move';
	canvas.selection = false;
	canvas.forEachObject(obj => obj.selectable = false);

	showNotification(`Перетаскивание узла (${node.lines.length} линий)`, 'info');
}

function updateNodeDrag(mouseX, mouseY) {
	if (!isDraggingNode || !draggedNodeKey) return;

	const pointer = canvas.getPointer({ clientX: mouseX, clientY: mouseY });
	const node = connectionNodes.get(draggedNodeKey);

	if (!node) return;

	const deltaX = pointer.x - node.x;
	const deltaY = pointer.y - node.y;

	affectedLines.forEach(lineInfo => {
		const line = lineInfo.line;

		if (lineInfo.isStart) {
			line.set({
				x1: roundTo5(line.x1 + deltaX),
				y1: roundTo5(line.y1 + deltaY)
			});
		} else {
			line.set({
				x2: roundTo5(line.x2 + deltaX),
				y2: roundTo5(line.y2 + deltaY)
			});
		}

		line.setCoords();
		createOrUpdateAirVolumeText(line);
	});

	node.x = roundTo5(pointer.x);
	node.y = roundTo5(pointer.y);

	const newKey = `${node.x}_${node.y}`;
	if (newKey !== draggedNodeKey) {
		connectionNodes.set(newKey, node);
		connectionNodes.delete(draggedNodeKey);
		draggedNodeKey = newKey;
	}

	canvas.renderAll();
}

function endNodeDrag() {
	if (!isDraggingNode) return;

	updateLineConnections();

	clearIntersectionPoints();
	const intersections = findAllIntersections();
	intersections.forEach((inter, idx) =>
		createIntersectionPoint(inter.x, inter.y, idx, inter)
	);

	// УБРАН ВЫЗОВ calculateAirVolumesForAllLines - расчет ТОЛЬКО по кнопке
	updateAllAirVolumeTexts();

	isDraggingNode = false;
	draggedNodeKey = null;
	affectedLines = [];

	canvas.defaultCursor = 'default';
	canvas.selection = true;
	canvas.forEachObject(obj => {
		if (obj.id !== 'grid-group' && obj.id !== 'grid-line') {
			obj.selectable = true;
		}
	});

	showNotification('Узел перемещен со всеми соединенными линиями', 'success');
}

function updateLineConnections() {
	buildConnectionGraph();
	drawConnectionNodes();
	canvas.renderAll();
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

	drawConnectionNodes();
	canvas.renderAll();
}

function isPointInLockedNode(x, y, threshold = APP_CONFIG.NODE_THRESHOLD) {
	for (const [key, node] of connectionNodes.entries()) {
		if (!node.locked) continue;

		const distance = Math.sqrt(
			Math.pow(x - node.x, 2) +
			Math.pow(y - node.y, 2)
		);

		if (distance < threshold) {
			return { node, distance };
		}
	}
	return null;
}

function getNearestNode(x, y) {
	let nearestNode = null;
	let minDistance = Infinity;

	for (const [key, node] of connectionNodes.entries()) {
		const distance = Math.sqrt(
			Math.pow(x - node.x, 2) +
			Math.pow(y - node.y, 2)
		);

		if (distance < minDistance) {
			minDistance = distance;
			nearestNode = { key, node, distance };
		}
	}

	return nearestNode;
}

// ==================== ФУНКЦИИ ДЛЯ ОТОБРАЖЕНИЯ ОБЪЕМА ВОЗДУХА ====================
function createOrUpdateAirVolumeText(line) {
	if (line.airVolumeText) {
		try {
			canvas.remove(line.airVolumeText);
		} catch (e) {
			console.warn('Ошибка при удалении старого текста:', e);
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
	const lines = canvas.getObjects().filter(obj => obj.type === 'line' && obj.id !== 'grid-line');
	let updatedCount = 0;

	lines.forEach(line => {
		try {
			if (line.properties && line.properties.airVolume !== undefined) {
				createOrUpdateAirVolumeText(line);
				updatedCount++;
			}
		} catch (err) {
			console.warn('Ошибка при обновлении текста линии:', err, line);
		}
	});

	canvas.renderAll();
	return updatedCount;
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

// ==================== ОСНОВНАЯ ФУНКЦИЯ РАСЧЕТА ОБЪЕМА ВОЗДУХА ====================
function calculateAirVolumesForAllLines(isManual = false) {
	if (!isManual) {
		console.log('Расчет вызван не через кнопку, пропускаем');
		return false;
	}

	if (isCalculatingAirVolumes) {
		console.log('Расчет уже выполняется, пропускаем вызов');
		return false;
	}

	isCalculatingAirVolumes = true;
	showNotification('Начинается расчет объемов воздуха...', 'info', 3000);

	try {
		const lines = canvas.getObjects().filter(obj => obj.type === 'line' && obj.id !== 'grid-line');
		const images = canvas.getObjects().filter(obj => obj.type === 'image' && obj.properties);

		console.log(`Найдено ${lines.length} линий и ${images.length} объектов`);

		// Строим граф точек пересечения
		const pointsMap = new Map();

		// Собираем все уникальные точки
		lines.forEach(line => {
			const startKey = `${roundTo5(line.x1)}_${roundTo5(line.y1)}`;
			const endKey = `${roundTo5(line.x2)}_${roundTo5(line.y2)}`;

			if (!pointsMap.has(startKey)) {
				pointsMap.set(startKey, {
					x: roundTo5(line.x1),
					y: roundTo5(line.y1),
					linesStarting: [],
					linesEnding: [],
					objects: [],
					airVolume: 0,
					objectResistance: 1
				});
			}

			const startPoint = pointsMap.get(startKey);
			startPoint.linesStarting.push({
				line: line,
				airVolume: line.properties?.airVolume || 0,
				airResistance: line.properties?.airResistance || 1,
				isStart: true
			});

			if (!pointsMap.has(endKey)) {
				pointsMap.set(endKey, {
					x: roundTo5(line.x2),
					y: roundTo5(line.y2),
					linesStarting: [],
					linesEnding: [],
					objects: [],
					airVolume: 0,
					objectResistance: 1
				});
			}

			const endPoint = pointsMap.get(endKey);
			endPoint.linesEnding.push({
				line: line,
				airVolume: line.properties?.airVolume || 0,
				airResistance: line.properties?.airResistance || 1,
				isStart: false
			});
		});

		// Добавляем объекты в точки
		images.forEach(image => {
			const center = getObjectCenter(image);
			let closestPointKey = null;
			let minDistance = Infinity;

			for (const [key, point] of pointsMap.entries()) {
				const distance = roundTo5(Math.sqrt(
					Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
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

				// Если у объекта есть объем воздуха, устанавливаем его в точке
				if (image.properties?.airVolume !== undefined && image.properties.airVolume !== null) {
					point.airVolume = roundTo5(image.properties.airVolume);
				}

				// Если у объекта есть сопротивление, устанавливаем его в точке
				if (image.properties?.airResistance !== undefined && image.properties.airResistance !== null) {
					point.objectResistance = roundTo5(image.properties.airResistance);
				}
			}
		});

		// Функция расчета объема для линий, исходящих из точки
		function calculateOutgoingLinesAirVolume(point, incomingAirVolume) {
			const outgoingLines = point.linesStarting;

			if (outgoingLines.length === 0) return;

			// Если есть объект с сопротивлением
			if (point.objectResistance !== 1 && point.objectResistance > 0) {
				// Делим входящий объем на сопротивление объекта
				const volumeAfterObject = roundTo5(incomingAirVolume / point.objectResistance);

				if (outgoingLines.length === 1) {
					// Случай 5: одна линия от объекта
					outgoingLines[0].line.properties.airVolume = volumeAfterObject;
					outgoingLines[0].line.set('properties', outgoingLines[0].line.properties);
				} else {
					// Случай 6: несколько линий от объекта
					// Рассчитываем суммарную проводимость всех линий
					let totalConductivity = 0;
					outgoingLines.forEach(lineInfo => {
						if (lineInfo.line.properties?.airResistance && lineInfo.line.properties.airResistance > 0) {
							totalConductivity += 1 / lineInfo.line.properties.airResistance;
						}
					});

					if (totalConductivity > 0) {
						outgoingLines.forEach(lineInfo => {
							if (lineInfo.line.properties?.airResistance && lineInfo.line.properties.airResistance > 0) {
								const lineConductivity = 1 / lineInfo.line.properties.airResistance;
								const lineVolume = roundTo5(volumeAfterObject * (lineConductivity / totalConductivity));
								lineInfo.line.properties.airVolume = lineVolume;
								lineInfo.line.set('properties', lineInfo.line.properties);
							}
						});
					}
				}
			} else {
				// Нет объекта с сопротивлением
				if (outgoingLines.length === 1) {
					// Случай 3: одна линия входит, одна выходит
					outgoingLines[0].line.properties.airVolume = incomingAirVolume;
					outgoingLines[0].line.set('properties', outgoingLines[0].line.properties);
				} else {
					// Случай 4: одна линия входит, несколько выходят
					// Рассчитываем суммарную проводимость всех линий
					let totalConductivity = 0;
					outgoingLines.forEach(lineInfo => {
						if (lineInfo.line.properties?.airResistance && lineInfo.line.properties.airResistance > 0) {
							totalConductivity += 1 / lineInfo.line.properties.airResistance;
						}
					});

					if (totalConductivity > 0) {
						outgoingLines.forEach(lineInfo => {
							if (lineInfo.line.properties?.airResistance && lineInfo.line.properties.airResistance > 0) {
								const lineConductivity = 1 / lineInfo.line.properties.airResistance;
								const lineVolume = roundTo5(incomingAirVolume * (lineConductivity / totalConductivity));
								lineInfo.line.properties.airVolume = lineVolume;
								lineInfo.line.set('properties', lineInfo.line.properties);
							}
						});
					}
				}
			}
		}

		// Обрабатываем точки с объектами (источники воздуха)
		for (const [key, point] of pointsMap.entries()) {
			if (point.objects.length > 0 && point.airVolume > 0) {
				const outgoingLines = point.linesStarting;

				if (outgoingLines.length === 1) {
					// Случай 1: от объекта отходит одна линия
					outgoingLines[0].line.properties.airVolume = point.airVolume;
					outgoingLines[0].line.set('properties', outgoingLines[0].line.properties);
				} else if (outgoingLines.length > 1) {
					// Случай 2: от объекта отходит несколько линий
					// Рассчитываем суммарную проводимость всех линий
					let totalConductivity = 0;
					outgoingLines.forEach(lineInfo => {
						if (lineInfo.line.properties?.airResistance && lineInfo.line.properties.airResistance > 0) {
							totalConductivity += 1 / lineInfo.line.properties.airResistance;
						}
					});

					if (totalConductivity > 0) {
						outgoingLines.forEach(lineInfo => {
							if (lineInfo.line.properties?.airResistance && lineInfo.line.properties.airResistance > 0) {
								const lineConductivity = 1 / lineInfo.line.properties.airResistance;
								const lineVolume = roundTo5(point.airVolume * (lineConductivity / totalConductivity));
								lineInfo.line.properties.airVolume = lineVolume;
								lineInfo.line.set('properties', lineInfo.line.properties);
							}
						});
					}
				}
			}
		}

		// Обрабатываем остальные точки (распространение воздуха)
		let changed = true;
		let iterations = 0;
		const maxIterations = 100;

		while (changed && iterations < maxIterations) {
			changed = false;
			iterations++;

			for (const [key, point] of pointsMap.entries()) {
				// Пропускаем точки, которые уже обработаны как источники
				if (point.objects.length > 0 && point.airVolume > 0) {
					continue;
				}

				// Суммируем входящий воздух
				let totalIncomingAir = 0;
				point.linesEnding.forEach(lineInfo => {
					if (lineInfo.line.properties?.airVolume !== undefined) {
						totalIncomingAir += lineInfo.line.properties.airVolume;
					}
				});

				// Если есть входящий воздух и есть исходящие линии
				if (totalIncomingAir > 0 && point.linesStarting.length > 0) {
					// Проверяем, изменился ли входящий объем
					if (Math.abs(totalIncomingAir - point.airVolume) > 0.0001) {
						changed = true;
						point.airVolume = roundTo5(totalIncomingAir);

						// Распределяем воздух по исходящим линиям
						calculateOutgoingLinesAirVolume(point, totalIncomingAir);
					}
				}
			}
		}

		// Обновляем тексты для всех линий
		let updatedCount = 0;
		lines.forEach(line => {
			try {
				if (line.properties && line.properties.airVolume !== undefined) {
					createOrUpdateAirVolumeText(line);
					updatedCount++;
				}
			} catch (err) {
				console.warn('Ошибка при обновлении текста линии:', err, line);
			}
		});

		// Проверяем корректность расчетов
		let totalObjectAir = 0;
		let totalLineAir = 0;

		images.forEach(image => {
			if (image.properties?.airVolume !== undefined) {
				totalObjectAir += image.properties.airVolume;
			}
		});

		lines.forEach(line => {
			if (line.properties?.airVolume !== undefined) {
				totalLineAir += line.properties.airVolume;
			}
		});

		console.log(`Суммарный объем объектов: ${roundTo5(totalObjectAir)} м³/с`);
		console.log(`Суммарный объем линий: ${roundTo5(totalLineAir)} м³/с`);

		// Проверяем баланс для каждой точки
		for (const [key, point] of pointsMap.entries()) {
			const incomingSum = point.linesEnding.reduce((sum, line) =>
				sum + (line.line.properties?.airVolume || 0), 0);
			const outgoingSum = point.linesStarting.reduce((sum, line) =>
				sum + (line.line.properties?.airVolume || 0), 0);

			if (Math.abs(incomingSum - outgoingSum) > 0.01 && point.objects.length === 0) {
				console.warn(`Дисбаланс в точке (${point.x}, ${point.y}): входящий=${incomingSum}, исходящий=${outgoingSum}`);
			}
		}

		canvas.renderAll();
		updatePropertiesPanel();

		if (updatedCount > 0) {
			showNotification(`Расчет завершен! Обновлено ${updatedCount} линий с объемом воздуха`, 'success');
		} else {
			showNotification('Расчет завершен, но не найдено линий для обновления', 'info');
		}

		return updatedCount > 0;

	} catch (error) {
		console.error('КРИТИЧЕСКАЯ ОШИБКА в calculateAirVolumesForAllLines:', error);
		showNotification('Ошибка при расчете объемов воздуха: ' + error.message, 'error');
		return false;
	} finally {
		isCalculatingAirVolumes = false;
	}
}

// ==================== АНАЛИЗ ТОЧЕК ПЕРЕСЕЧЕНИЯ ====================
function analyzeIntersectionPoints() {
	console.log('=== НАЧАЛО АНАЛИЗА ТОЧЕК ПЕРЕСЕЧЕНИЯ ===');

	const lines = canvas.getObjects().filter(obj => obj.type === 'line' && obj.id !== 'grid-line');
	const images = canvas.getObjects().filter(obj => obj.type === 'image');

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
			isStart: true
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
			isStart: false
		});
	});

	images.forEach(image => {
		const center = getObjectCenter(image);
		let closestPointKey = null;
		let minDistance = Infinity;

		for (const [key, point] of pointsMap.entries()) {
			const distance = roundTo5(Math.sqrt(
				Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
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
				airVolume: image.properties?.airVolume || 0
			});
		}
	});

	let totalPoints = 0;
	let pointsWithObjects = 0;
	let pointsWithMultipleLines = 0;

	for (const [key, point] of pointsMap.entries()) {
		totalPoints++;
		const totalLines = point.linesStarting.length + point.linesEnding.length;

		if (point.objects.length > 0 && totalLines >= 2) {
			pointsWithObjects++;
			console.log(`\n📌 ТОЧКА (${point.x.toFixed(2)}, ${point.y.toFixed(2)}) С ОБЪЕКТОМ:`);
			console.log(`   Всего линий: ${totalLines}`);
			console.log(`   Началом: ${point.linesStarting.length}`);
			console.log(`   Концом: ${point.linesEnding.length}`);
			console.log(`   Объектов: ${point.objects.length}`);

			point.objects.forEach((obj, index) => {
				console.log(`   Объект ${index + 1}: ${obj.name}, Объем: ${obj.airVolume.toFixed(3)} м³/с`);
			});
		}

		if (point.linesEnding.length === 1 && point.linesStarting.length >= 1) {
			pointsWithMultipleLines++;
			const incomingVolume = point.linesEnding[0].airVolume || 0;

			if (point.objects.length > 0 && point.objects[0].object.properties?.airResistance) {
				// Случай 5 и 6: есть объект с сопротивлением
				const objectResistance = point.objects[0].object.properties.airResistance;
				const volumeAfterObject = roundTo5(incomingVolume / objectResistance);

				if (point.linesStarting.length === 1) {
					// Случай 5: одна линия от объекта
					point.linesStarting[0].line.properties.airVolume = volumeAfterObject;
					point.linesStarting[0].line.set('properties', point.linesStarting[0].line.properties);
					createOrUpdateAirVolumeText(point.linesStarting[0].line);
					console.log(`\n🔗 ТОЧКА (${point.x.toFixed(2)}, ${point.y.toFixed(2)}):`);
					console.log(`   Входящий объем: ${incomingVolume.toFixed(3)} м³/с`);
					console.log(`   Сопротивление объекта: ${objectResistance}`);
					console.log(`   Объем после объекта: ${volumeAfterObject.toFixed(3)} м³/с`);
					console.log(`   Линия получает: ${volumeAfterObject.toFixed(3)} м³/с`);
				} else {
					// Случай 6: несколько линий от объекта
					let totalConductivity = 0;
					point.linesStarting.forEach(lineInfo => {
						if (lineInfo.line.properties?.airResistance && lineInfo.line.properties.airResistance > 0) {
							totalConductivity += 1 / lineInfo.line.properties.airResistance;
						}
					});

					if (totalConductivity > 0) {
						console.log(`\n🔗 ТОЧКА (${point.x.toFixed(2)}, ${point.y.toFixed(2)}):`);
						console.log(`   Входящий объем: ${incomingVolume.toFixed(3)} м³/с`);
						console.log(`   Сопротивление объекта: ${objectResistance}`);
						console.log(`   Объем после объекта: ${volumeAfterObject.toFixed(3)} м³/с`);
						console.log(`   Суммарная проводимость линий: ${totalConductivity.toFixed(3)}`);

						point.linesStarting.forEach((lineInfo, index) => {
							if (lineInfo.line.properties?.airResistance && lineInfo.line.properties.airResistance > 0) {
								const lineConductivity = 1 / lineInfo.line.properties.airResistance;
								const lineVolume = roundTo5(volumeAfterObject * (lineConductivity / totalConductivity));
								lineInfo.line.properties.airVolume = lineVolume;
								lineInfo.line.set('properties', lineInfo.line.properties);
								createOrUpdateAirVolumeText(lineInfo.line);
								console.log(`   Линия ${index + 1} (R=${lineInfo.line.properties.airResistance.toFixed(3)}) получает: ${lineVolume.toFixed(3)} м³/с`);
							}
						});
					}
				}
			} else {
				// Нет объекта с сопротивлением
				if (point.linesStarting.length === 1) {
					// Случай 3: одна линия входит, одна выходит
					point.linesStarting[0].line.properties.airVolume = incomingVolume;
					point.linesStarting[0].line.set('properties', point.linesStarting[0].line.properties);
					createOrUpdateAirVolumeText(point.linesStarting[0].line);
					console.log(`\n🔄 ТОЧКА (${point.x.toFixed(2)}, ${point.y.toFixed(2)}):`);
					console.log(`   Подходит одна линия концом и одна линия началом`);
					console.log(`   Объем входящей линии: ${incomingVolume.toFixed(3)} м³/с`);
					console.log(`   Линия получает: ${incomingVolume.toFixed(3)} м³/с`);
				} else {
					// Случай 4: одна линия входит, несколько выходят
					let totalConductivity = 0;
					point.linesStarting.forEach(lineInfo => {
						if (lineInfo.line.properties?.airResistance && lineInfo.line.properties.airResistance > 0) {
							totalConductivity += 1 / lineInfo.line.properties.airResistance;
						}
					});

					if (totalConductivity > 0) {
						console.log(`\n🔗 ТОЧКА (${point.x.toFixed(2)}, ${point.y.toFixed(2)}):`);
						console.log(`   Подходит одна линия концом и ${point.linesStarting.length} линий началом`);
						console.log(`   Объем входящей линии: ${incomingVolume.toFixed(3)} м³/с`);
						console.log(`   Суммарная проводимость линий: ${totalConductivity.toFixed(3)}`);

						point.linesStarting.forEach((lineInfo, index) => {
							if (lineInfo.line.properties?.airResistance && lineInfo.line.properties.airResistance > 0) {
								const lineConductivity = 1 / lineInfo.line.properties.airResistance;
								const lineVolume = roundTo5(incomingVolume * (lineConductivity / totalConductivity));
								lineInfo.line.properties.airVolume = lineVolume;
								lineInfo.line.set('properties', lineInfo.line.properties);
								createOrUpdateAirVolumeText(lineInfo.line);
								console.log(`   Линия ${index + 1} (R=${lineInfo.line.properties.airResistance.toFixed(3)}) получает: ${lineVolume.toFixed(3)} м³/с`);
							}
						});
					}
				}
			}
		}
	}

	console.log('\n=== СВОДКА АНАЛИЗА ===');
	console.log(`Всего точек: ${totalPoints}`);
	console.log(`Точек с объектами: ${pointsWithObjects}`);
	console.log(`Точек с несколькими линиями: ${pointsWithMultipleLines}`);
	console.log('=== КОНЕЦ АНАЛИЗА ===');

	canvas.renderAll();
	updatePropertiesPanel();
	showNotification(`Анализ завершен! Обработано ${totalPoints} точек`, 'success');

	return pointsMap;
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

	return { x: roundTo5(xx), y: roundTo5(yy), param: param };
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
				y: roundTo5(point.y)
			};
			else if (minDist === distToRight) return {
				x: roundTo5(right),
				y: roundTo5(point.y)
			};
			else if (minDist === distToTop) return {
				x: roundTo5(point.x),
				y: roundTo5(top)
			};
			else return { x: roundTo5(point.x), y: roundTo5(bottom) };
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
			return { x: closestX, y: closestY };
		}
	}

	if (object.type === 'circle') {
		const radius = roundTo5(object.radius * object.scaleX);
		const dx = roundTo5(point.x - center.x);
		const dy = roundTo5(point.y - center.y);
		const distance = roundTo5(Math.sqrt(dx * dx + dy * dy));
		if (distance === 0) return {
			x: roundTo5(center.x + radius),
			y: roundTo5(center.y)
		};
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

	setupNodeMouseEvents();
}

function setupNodeMouseEvents() {
	document.addEventListener('mousemove', function (e) {
		if (isDraggingNode) {
			updateNodeDrag(e.clientX, e.clientY);
		}
	});

	document.addEventListener('mouseup', function () {
		if (isDraggingNode) {
			endNodeDrag();
		}
	});
}

// НОВАЯ ФУНКЦИЯ: Поиск линии в точке
function findLineAtPoint(point, threshold = APP_CONFIG.SNAP_RADIUS) {
	const lines = canvas.getObjects().filter(obj => obj.type === 'line' && obj.id !== 'grid-line' && !obj.isPreview);
	let closestLine = null;
	let closestPoint = null;
	let minDistance = Infinity;
	let param = 0;

	for (const line of lines) {
		const { x, y, param: t } = findClosestPointOnLine(point, line);
		const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
		if (distance < minDistance && distance < threshold) {
			minDistance = distance;
			closestLine = line;
			closestPoint = { x, y };
			param = t;
		}
	}

	if (closestLine) {
		const isEnd = param < 0.05 || param > 0.95;
		return { line: closestLine, point: closestPoint, param, isEnd };
	}

	return null;
}

function handleCanvasMouseDown(options) {
	const pointer = canvas.getPointer(options.e);

	if (isDraggingNode) {
		options.e.preventDefault();
		return;
	}

	if (options.e.shiftKey && currentImageData) {
		addImageAtPosition(pointer.x, pointer.y);
		return;
	}

	if (isDrawingLine) {
		if (!lineStartPoint) {
			// Начало линии
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

			if (!startPointFromObject) {
				snappedX = roundTo5(snapToGrid(pointer.x, APP_CONFIG.GRID_SIZE));
				snappedY = roundTo5(snapToGrid(pointer.y, APP_CONFIG.GRID_SIZE));
			}

			// Проверяем, не кликнули ли мы на линию (если не привязываемся к объекту)
			if (!altKeyPressed) {
				const lineAtPoint = findLineAtPoint(pointer);
				if (lineAtPoint && !lineAtPoint.isEnd) {
					// Разделяем линию в точке клика
					const splitResult = splitLineAtPoint(lineAtPoint.line, lineAtPoint.point);
					if (splitResult) {
						saveToUndoStack();
						canvas.remove(lineAtPoint.line);
						removeAirVolumeText(lineAtPoint.line);
						canvas.add(splitResult.line1);
						canvas.add(splitResult.line2);
						createOrUpdateAirVolumeText(splitResult.line1);
						createOrUpdateAirVolumeText(splitResult.line2);

						// Устанавливаем начальную точку новой линии в точку разделения
						lineStartPoint = {
							x: lineAtPoint.point.x,
							y: lineAtPoint.point.y,
							lineSplit: true
						};

						// Обновляем граф соединений и пересчитываем объемы воздуха
						updateLineConnections();
						// УБРАН ВЫЗОВ calculateAirVolumesForAllLines - расчет ТОЛЬКО по кнопке
						updateAllAirVolumeTexts();
					} else {
						lineStartPoint = {
							x: snappedX,
							y: snappedY,
							...(startPointFromObject || {})
						};
					}
				} else if (lineAtPoint && lineAtPoint.isEnd) {
					// Начало линии в конце существующей линии
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

			// Создаем preview линию
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
			return;
		} else {
			// Завершение линии
			handleLineDrawing(options, pointer);
			return;
		}
	}

	const target = options.target;
	if (target && target.type === 'line') {
		const nearestNode = getNearestNode(pointer.x, pointer.y);
		if (nearestNode && nearestNode.distance < APP_CONFIG.NODE_THRESHOLD * 2) {
			options.e.preventDefault();
			startNodeDrag(nearestNode.key, options.e.clientX, options.e.clientY);
			return;
		}
	}

	if (options.e.button === 2) {
		const activeObject = canvas.getActiveObject();
		if (activeObject) showContextMenu(pointer.x, pointer.y);
		options.e.preventDefault();
	}
}

function handleLineDrawing(options, pointer) {
	// Эта функция теперь вызывается только для завершения линии
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

	if (!startPointFromObject) {
		snappedX = roundTo5(snapToGrid(pointer.x, APP_CONFIG.GRID_SIZE));
		snappedY = roundTo5(snapToGrid(pointer.y, APP_CONFIG.GRID_SIZE));
	}

	const length = roundTo5(Math.sqrt(Math.pow(snappedX - lineStartPoint.x, 2) + Math.pow(snappedY - lineStartPoint.y, 2)));

	const lineId = 'line_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

	const passageLength = roundTo5(parseFloat(document.getElementById('propertyPassageLength')?.value) || 0.5);
	const roughnessCoefficient = roundTo5(parseFloat(document.getElementById('propertyRoughnessCoefficient')?.value) || 0.015);
	const crossSectionalArea = roundTo5(parseFloat(document.getElementById('propertyCrossSectionalArea')?.value) || 10);
	const perimeter = calculateLinePerimeter(crossSectionalArea);
	const airResistance = calculateAirResistance(roughnessCoefficient, perimeter, passageLength, crossSectionalArea);

	// ВАЖНОЕ ИЗМЕНЕНИЕ: НЕ устанавливаем initialAirVolume из объекта!
	// Объем воздуха будет устанавливаться ТОЛЬКО при расчете по кнопке
	const initialAirVolume = 0; // Всегда 0 при создании

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
			name: `Линия ${canvas.getObjects().filter(o => o.type === 'line' && !o.isPreview).length + 1}`,
			passageLength: passageLength,
			roughnessCoefficient: roughnessCoefficient,
			crossSectionalArea: crossSectionalArea,
			W: 1.0,
			airResistance: airResistance,
			airVolume: initialAirVolume, // Всегда 0 при создании
			perimeter: perimeter,
			length: length,
			startPoint: { x: lineStartPoint.x, y: lineStartPoint.y },
			endPoint: { x: snappedX, y: snappedY }
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

	setTimeout(() => {
		updateLineConnections();
		// УБРАН ВЫЗОВ calculateAirVolumesForAllLines - расчет ТОЛЬКО по кнопке
		updateAllAirVolumeTexts();
	}, 50);

	canvas.renderAll();
	updatePropertiesPanel();
	updateStatus();

	if (!isContinuousLineMode) {
		deactivateAllModes();
	} else {
		lineStartPoint = { x: snappedX, y: snappedY };
		lastLineEndPoint = { x: snappedX, y: snappedY };

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
	}
}

function handleCanvasMouseMove(options) {
	if (!isDrawingLine || !lineStartPoint) return;

	const pointer = canvas.getPointer(options.e);
	const snappedX = roundTo5(snapToGrid(pointer.x, APP_CONFIG.GRID_SIZE));
	const snappedY = roundTo5(snapToGrid(pointer.y, APP_CONFIG.GRID_SIZE));

	const previewLine = canvas.getObjects().find(obj => obj.id === 'preview-line');
	if (previewLine) {
		previewLine.set({ x2: snappedX, y2: snappedY });
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

	canvas.requestRenderAll();
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
	if (e.target && e.target.id !== 'intersection-point' &&
		e.target.id !== 'intersection-point-label' &&
		e.target.id !== 'air-volume-text' &&
		e.target.id !== 'node-marker' &&
		e.target.id !== 'node-marker-text') {
		setTimeout(() => {
			updateLineConnections();
			bringIntersectionPointsToFront();
			bringNodeMarkersToFront();
			updateAllAirVolumeTexts();
			canvas.renderAll();
		}, 10);
	}
}

function handleObjectModified(e) {
	if (e.target && e.target.type === 'line') {
		if (e.target.properties) {
			calculateAllLineProperties(e.target);
		}
		createOrUpdateAirVolumeText(e.target);
		setTimeout(updateLineConnections, 50);
	}
}

function handleObjectRemoved(e) {
	if (e.target && e.target.type === 'line') {
		removeAirVolumeText(e.target);
	}
	setTimeout(updateLineConnections, 50);
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
	currentImageData = null;

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

	}, { crossOrigin: 'anonymous' });
}

// ==================== РАЗДЕЛЕНИЕ ЛИНИЙ (ИСПРАВЛЕННОЕ) ====================
function splitAllLines() {
	clearIntersectionPoints();
	const intersections = findAllIntersections();
	intersectionPoints = intersections;

	intersections.forEach((inter, index) => createIntersectionPoint(inter.x, inter.y, index, inter));

	// Сначала собираем все линии, которые нужно разделить
	const linesToSplit = new Map();

	intersections.forEach((inter, index) => {
		if (inter.line1 && inter.line2) {
			const nodeCheck1 = isPointInLockedNode(inter.x, inter.y);
			if (nodeCheck1 && nodeCheck1.node.locked) {
				console.log(`Пропускаем разделение в заблокированном узле (${inter.x}, ${inter.y})`);
				return;
			}

			if (!linesToSplit.has(inter.line1)) {
				linesToSplit.set(inter.line1, []);
			}
			if (!linesToSplit.has(inter.line2)) {
				linesToSplit.set(inter.line2, []);
			}

			linesToSplit.get(inter.line1).push(inter);
			linesToSplit.get(inter.line2).push(inter);
		} else if (inter.line1 && inter.object) {
			if (lineSplitMode !== 'MANUAL' || autoSplitMode) {
				const nodeCheck = isPointInLockedNode(inter.x, inter.y);
				if (nodeCheck && nodeCheck.node.locked) {
					console.log(`Пропускаем разделение в заблокированном узле (${inter.x}, ${inter.y})`);
					return;
				}

				if (!linesToSplit.has(inter.line1)) {
					linesToSplit.set(inter.line1, []);
				}
				linesToSplit.get(inter.line1).push(inter);
			}
		}
	});

	// Теперь разделяем линии, сортируя точки по расстоянию от начала линии
	linesToSplit.forEach((intersections, line) => {
		if (intersections.length === 0) return;

		// Сортируем точки пересечения по расстоянию от начала линии
		intersections.sort((a, b) => {
			const distA = Math.sqrt(Math.pow(a.x - line.x1, 2) + Math.pow(a.y - line.y1, 2));
			const distB = Math.sqrt(Math.pow(b.x - line.x1, 2) + Math.pow(b.y - line.y1, 2));
			return distA - distB;
		});

		let currentLine = line;
		let lastEndPoint = { x: line.x1, y: line.y1 };

		for (const inter of intersections) {
			const splitResult = splitLineAtPoint(currentLine, {
				x: roundTo5(inter.x),
				y: roundTo5(inter.y)
			});

			if (splitResult) {
				saveToUndoStack();
				canvas.remove(currentLine);
				removeAirVolumeText(currentLine);

				// Обновляем первую часть линии
				splitResult.line1.set({
					x1: lastEndPoint.x,
					y1: lastEndPoint.y,
					x2: inter.x,
					y2: inter.y
				});

				canvas.add(splitResult.line1);
				canvas.add(splitResult.line2);
				createOrUpdateAirVolumeText(splitResult.line1);
				createOrUpdateAirVolumeText(splitResult.line2);

				// Продолжаем со второй частью для следующего разделения
				currentLine = splitResult.line2;
				lastEndPoint = { x: inter.x, y: inter.y };
			}
		}
	});

	setTimeout(() => {
		updateLineConnections();
		// УБРАН ВЫЗОВ calculateAirVolumesForAllLines - расчет ТОЛЬКО по кнопке
		updateAllAirVolumeTexts();
		canvas.renderAll();
	}, 100);

	bringIntersectionPointsToFront();

	if (intersections.length > 0) {
		showNotification(`Найдено ${intersections.length} точек пересечения`, 'success');
	} else {
		showNotification('Пересечений для разделения не найдено', 'info');
	}
}

function splitAllLinesAtObjectCenters() {
	const lines = canvas.getObjects().filter(obj => obj.type === 'line' && obj.id !== 'grid-line');
	const images = canvas.getObjects().filter(obj => obj.type === 'image');
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

		// Сортируем точки по расстоянию от начала линии
		intersections.sort((a, b) => {
			const distA = Math.sqrt(Math.pow(a.point.x - line.x1, 2) + Math.pow(a.point.y - line.y1, 2));
			const distB = Math.sqrt(Math.pow(b.point.x - line.x1, 2) + Math.pow(b.point.y - line.y1, 2));
			return distA - distB;
		});

		let currentLine = line;
		let lastEndPoint = { x: line.x1, y: line.y1 };

		for (const inter of intersections) {
			const nodeCheck = isPointInLockedNode(inter.point.x, inter.point.y);
			if (nodeCheck && nodeCheck.node.locked) {
				console.log(`Пропускаем разделение в заблокированном узле (${inter.point.x}, ${inter.point.y})`);
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

				// Обновляем первую часть линии
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

				// Продолжаем со второй частью для следующего разделения
				currentLine = splitResult.line2;
				lastEndPoint = { x: inter.point.x, y: inter.point.y };
				splitCount++;
			}
		}
	});

	setTimeout(() => {
		updateLineConnections();
		// УБРАН ВЫЗОВ calculateAirVolumesForAllLines - расчет ТОЛЬКО по кнопке
		clearIntersectionPoints();
		const intersections = findAllIntersections();
		intersections.forEach((inter, idx) => createIntersectionPoint(inter.x, inter.y, idx, inter));
		bringIntersectionPointsToFront();
		canvas.renderAll();
	}, 50);

	if (splitCount > 0) {
		showNotification(`Разделено ${splitCount} линий по центрам объектов`, 'success');
	} else {
		showNotification('Линий для разделения по центрам объектов не найдено', 'info');
	}
}

function findAllIntersections() {
	const lines = canvas.getObjects().filter(obj => obj.type === 'line' && obj.id !== 'grid-line' && !obj.isPreview);
	const images = canvas.getObjects().filter(obj => obj.type === 'image');
	const intersections = [];

	for (let i = 0; i < lines.length; i++) {
		for (let j = i + 1; j < lines.length; j++) {
			const intersection = lineIntersection(lines[i], lines[j]);
			if (intersection) intersections.push(intersection);
		}
	}

	lines.forEach(line => {
		images.forEach(image => {
			const center = getObjectCenter(image);
			const closestPoint = findClosestPointOnLine(center, line);
			if (closestPoint.param >= 0 && closestPoint.param <= 1) {
				const tolerance = roundTo5(Math.max(image.width * image.scaleX, image.height * image.scaleY) / 2);
				const distanceToCenter = roundTo5(Math.sqrt(Math.pow(closestPoint.x - center.x, 2) + Math.pow(closestPoint.y - center.y, 2)));
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
	if (Math.abs(denominator) < 0.000001) return null;

	const ua = roundTo5(((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator);
	const ub = roundTo5(((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator);
	if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
		const x = roundTo5(x1 + ua * (x2 - x1));
		const y = roundTo5(y1 + ua * (y2 - y1));
		return { x, y, ua, ub, line1, line2 };
	}
	return null;
}

function splitLineAtPoint(line, point) {
	const nodeCheck = isPointInLockedNode(point.x, point.y);
	if (nodeCheck && nodeCheck.node.locked) {
		showNotification('Нельзя разделить линию в заблокированном узле!', 'error');
		return null;
	}

	const dx1 = roundTo5(point.x - line.x1);
	const dy1 = roundTo5(point.y - line.y1);
	const dx2 = roundTo5(point.x - line.x2);
	const dy2 = roundTo5(point.y - line.y2);
	const distance1 = roundTo5(Math.sqrt(dx1 * dx1 + dy1 * dy1));
	const distance2 = roundTo5(Math.sqrt(dx2 * dx2 + dy2 * dy2));
	if (distance1 < 0.1 || distance2 < 0.1) return null;

	const totalLength = roundTo5(Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2)));
	if (distance1 < 1 || distance2 < 1) return null;

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
	if (t < 0 || t > 1) return null;

	normalizeLineProperties(line);
	const props = line.properties || {};
	const proportion1 = roundTo5(distance1 / totalLength);
	const proportion2 = roundTo5(distance2 / totalLength);

	// Правильное распределение свойств
	const passageLength1 = roundTo5((props.passageLength || 0.5) * proportion1);
	const passageLength2 = roundTo5((props.passageLength || 0.5) * proportion2);
	const crossSectionalArea1 = roundTo5(props.crossSectionalArea || 10);
	const crossSectionalArea2 = roundTo5(props.crossSectionalArea || 10);
	const perimeter1 = calculateLinePerimeter(crossSectionalArea1);
	const perimeter2 = calculateLinePerimeter(crossSectionalArea2);
	const airResistance1 = calculateAirResistance(props.roughnessCoefficient || 0.015, perimeter1, passageLength1, crossSectionalArea1);
	const airResistance2 = calculateAirResistance(props.roughnessCoefficient || 0.015, perimeter2, passageLength2, crossSectionalArea2);

	// ВАЖНОЕ ИЗМЕНЕНИЕ: НЕ распределяем объем воздуха при разделении!
	// Объем воздуха будет устанавливаться ТОЛЬКО при расчете по кнопке
	const airVolume1 = 0; // Всегда 0 при разделении
	const airVolume2 = 0; // Всегда 0 при разделении

	const line1Id = 'line_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
	const line2Id = 'line_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

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
		properties: {
			...props,
			name: `${props.name || 'Линия'} (часть 1)`,
			length: distance1,
			passageLength: passageLength1,
			crossSectionalArea: crossSectionalArea1,
			perimeter: perimeter1,
			airResistance: airResistance1,
			airVolume: airVolume1, // Всегда 0 при разделении
			startPoint: { x: line.x1, y: line.y1 },
			endPoint: { x: point.x, y: point.y }
		}
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
		properties: {
			...props,
			name: `${props.name || 'Линия'} (часть 2)`,
			length: distance2,
			passageLength: passageLength2,
			crossSectionalArea: crossSectionalArea2,
			perimeter: perimeter2,
			airResistance: airResistance2,
			airVolume: airVolume2, // Всегда 0 при разделении
			startPoint: { x: point.x, y: point.y },
			endPoint: { x: line.x2, y: line.y2 }
		}
	});

	if (line.lineStartsFromObject && line.startObject && line.x1 === line1.x1 && line.y1 === line1.y1) {
		line1.lineStartsFromObject = true;
		line1.startObject = line.startObject;
		if (line1.properties) line1.properties.startsFromObject = line.properties?.startsFromObject;
	}

	return { line1, line2 };
}

function splitLinesAtImagePosition(image) {
	const lines = canvas.getObjects().filter(obj => obj.type === 'line' && obj.id !== 'grid-line');
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
					console.log(`Пропускаем разделение в заблокированном узле (${closestPoint.x}, ${closestPoint.y})`);
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
		updateLineConnections();
		// УБРАН ВЫЗОВ calculateAirVolumesForAllLines - расчет ТОЛЬКО по кнопке
		updateAllAirVolumeTexts();
		canvas.renderAll();
	}, 50);

	if (splitCount > 0) showNotification(`Разделено ${splitCount} линий по центру объектов`, 'success');
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

	circle.on('mousedown', function (e) {
		if (e.e.button === 0) {
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
	intersectionVisuals.push({ circle, text });
	canvas.renderAll();
	return circle;
}

function createIntersectionPointForLineStart(line) {
	if (!line.lineStartsFromObject || !line.startObject) return;
	const startPoint = { x: line.x1, y: line.y1 };
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
	const count = canvas.getObjects().filter(obj => obj.id !== 'grid-group' && obj.id !== 'grid-line').length;
	let statusText = `<strong>Объектов:</strong> ${count}`;
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
				else if (modal.id === 'pdfExportModal') closePdfExportModal();
			}
		});
	});

	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') {
			closeLinePropertiesModal();
			closeAddImageModal();
			closeObjectPropertiesModal();
			closeIntersectionPointModal();
			closeAirVolumeReport();
			closePdfExportModal();
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

		const lines = canvas.getObjects().filter(obj => obj.type === 'line' && obj.id !== 'grid-line');
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

function closeIntersectionPointModal() {
	document.getElementById('intersectionPointModal').style.display = 'none';
}

// ==================== УПРАВЛЕНИЕ ПРОЕКТОМ ====================
function saveDrawing() {
	const json = JSON.stringify(canvas.toJSON(['id', 'properties', 'pointIndex', 'pointData', 'lineStartsFromObject', 'startObject', 'airVolumeText', 'isPreview']));
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
								// НЕ устанавливаем airVolume из объекта!
								// Объем воздуха будет рассчитываться ТОЛЬКО по кнопке
							}
						}
						if (obj.type === 'line') normalizeLineProperties(obj);
					});

					setTimeout(() => {
						updateLineConnections();
						// УБРАН ВЫЗОВ calculateAirVolumesForAllLines - расчет ТОЛЬКО по кнопке
						updateAllAirVolumeTexts();
						canvas.renderAll();
					}, 100);

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
			updateLineConnections();
			// УБРАН ВЫЗОВ calculateAirVolumesForAllLines - расчет ТОЛЬКО по кнопке
			updateAllAirVolumeTexts();
			canvas.renderAll();
		}, 10);
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
			updateLineConnections();
			// УБРАН ВЫЗОВ calculateAirVolumesForAllLines - расчет ТОЛЬКО по кнопке
			updateAllAirVolumeTexts();
			canvas.renderAll();
		}, 10);
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
			hideContextMenu();
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
				setTimeout(updateLineConnections, 50);
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
	setTimeout(updateLineConnections, 50);
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
		setTimeout(updateLineConnections, 50);
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

// ==================== ЭКСПОРТ В PDF ====================
function showPdfExportModal() {
	const lines = canvas.getObjects().filter(obj => obj.type === 'line' && obj.id !== 'grid-line' && !obj.isPreview);
	const images = canvas.getObjects().filter(obj => obj.type === 'image');

	document.getElementById('pdfTotalObjects').textContent = lines.length + images.length;
	document.getElementById('pdfTotalLines').textContent = lines.length;
	document.getElementById('pdfTotalImages').textContent = images.length;
	document.getElementById('pdfTotalAirVolume').textContent =
		lines.reduce((sum, line) => sum + (line.properties?.airVolume || 0), 0).toFixed(3);

	document.getElementById('pdfExportModal').style.display = 'flex';
}

function closePdfExportModal() {
	document.getElementById('pdfExportModal').style.display = 'none';
}

function exportToPdf() {
	const title = document.getElementById('pdfTitle').value || 'Технический чертеж';
	const author = document.getElementById('pdfAuthor').value || 'Редактор чертежей';
	const includeGrid = document.getElementById('pdfIncludeGrid').checked;
	const includeAirVolumes = document.getElementById('pdfIncludeAirVolumes').checked;

	showNotification('Подготовка PDF...', 'info');

	setTimeout(() => {
		showNotification('Экспорт в PDF завершен!', 'success');
		closePdfExportModal();

		console.log('Экспорт PDF с параметрами:', {
			title,
			author,
			includeGrid,
			includeAirVolumes
		});

		const blob = new Blob([`PDF: ${title}\nАвтор: ${author}\nОбъектов: ${canvas.getObjects().filter(obj => !obj.isPreview).length}`],
			{ type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${title.replace(/\s+/g, '_')}.pdf`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, 1500);
}

// ==================== ТЕСТИРОВАНИЕ И ДЕБАГ ====================
function testNodeConnection() {
	console.log('=== ТЕСТИРОВАНИЕ НЕРАЗРЫВНЫХ СОЕДИНЕНИЙ ===');
	clearCanvas();

	const line1 = new fabric.Line([100, 100, 200, 100], {
		stroke: '#4A00E0',
		strokeWidth: 5,
		properties: { name: 'Линия 1', airVolume: 0 } // Установлено 0 вместо 10
	});

	const line2 = new fabric.Line([200, 100, 200, 200], {
		stroke: '#4A00E0',
		strokeWidth: 5,
		properties: { name: 'Линия 2', airVolume: 0 } // Установлено 0 вместо 5
	});

	const line3 = new fabric.Line([200, 100, 300, 100], {
		stroke: '#4A00E0',
		strokeWidth: 5,
		properties: { name: 'Линия 3', airVolume: 0 } // Установлено 0 вместо 5
	});

	canvas.add(line1);
	canvas.add(line2);
	canvas.add(line3);

	updateLineConnections();

	const testImage = {
		id: 'test-fan',
		name: 'Тестовый вентилятор',
		path: './img/fan.png',
		type: 'fan'
	};

	fabric.Image.fromURL(testImage.path, function (img) {
		img.set({
			left: 100,
			top: 100,
			scaleX: 0.5,
			scaleY: 0.5,
			properties: {
				name: testImage.name,
				type: testImage.type,
				airVolume: 10
			}
		});
		canvas.add(img);

		line1.lineStartsFromObject = true;
		line1.startObject = img;

		setTimeout(() => {
			// УБРАН ВЫЗОВ calculateAirVolumesForAllLines - расчет ТОЛЬКО по кнопке
			updateAllAirVolumeTexts();

			showNotification('Тестовая сцена создана. Нажмите "Расчет воздуха" для расчета', 'success');
			console.log('Узел в точке (200,100) должен содержать 3 линии');
		}, 500);
	});
}

// ==================== ИНИЦИАЛИЗАЦИЯ ДОПОЛНИТЕЛЬНЫХ КНОПОК ====================
document.addEventListener('DOMContentLoaded', function () {
	const testNodeBtn = document.getElementById('testNodeBtn');
	if (testNodeBtn) {
		testNodeBtn.addEventListener('click', testNodeConnection);
	}

	const pdfExportBtn = document.getElementById('pdfExportBtn');
	if (pdfExportBtn) {
		pdfExportBtn.addEventListener('click', showPdfExportModal);
	}

	const closePdfBtn = document.querySelector('#pdfExportModal .close-btn');
	if (closePdfBtn) {
		closePdfBtn.addEventListener('click', closePdfExportModal);
	}

	const exportPdfBtn = document.getElementById('exportPdfBtn');
	if (exportPdfBtn) {
		exportPdfBtn.addEventListener('click', exportToPdf);
	}

	initializeTooltips();
});

// ==================== ТУЛТИПЫ ====================
function initializeTooltips() {
	const tooltipElements = document.querySelectorAll('[data-tooltip]');

	tooltipElements.forEach(element => {
		element.addEventListener('mouseenter', function (e) {
			const tooltipText = this.getAttribute('data-tooltip');
			const tooltip = document.createElement('div');
			tooltip.className = 'tooltip';
			tooltip.textContent = tooltipText;
			tooltip.style.position = 'absolute';
			tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
			tooltip.style.color = 'white';
			tooltip.style.padding = '5px 10px';
			tooltip.style.borderRadius = '4px';
			tooltip.style.fontSize = '12px';
			tooltip.style.zIndex = '10000';
			tooltip.style.pointerEvents = 'none';

			document.body.appendChild(tooltip);

			const rect = this.getBoundingClientRect();
			tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
			tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';

			this._tooltip = tooltip;
		});

		element.addEventListener('mouseleave', function () {
			if (this._tooltip) {
				this._tooltip.remove();
				this._tooltip = null;
			}
		});
	});
}

// ==================== ОБРАБОТКА ОШИБОК ====================
window.addEventListener('error', function (e) {
	console.error('Глобальная ошибка:', e.error);
	showNotification(`Ошибка: ${e.error.message}`, 'error');
});

// ==================== ЭКСПОРТ ГЛОБАЛЬНЫХ ФУНКЦИЙ ====================
window.canvas = canvas;
window.analyzeIntersectionPoints = analyzeIntersectionPoints;
window.calculateAirVolumesForAllLines = calculateAirVolumesForAllLines;
window.testNodeConnection = testNodeConnection;
window.clearIntersectionPoints = clearIntersectionPoints;
window.updateLineConnections = updateLineConnections;
window.toggleNodeLock = toggleNodeLock;

console.log('Редактор технических чертежей с неразрывными соединениями полностью загружен! ФИНАЛЬНАЯ версия.');