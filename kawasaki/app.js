// グローバル変数
let allRoutes = []; // 全てのバス路線データ
let isDevMode = false; // 開発モードフラグ
let isUpdatingInfo = false; // 更新中フラグ - 無限ループ防止用


let holidayCache = {}; // 祝日判定用の変数を追加
let holidayDataLoaded = false; // 祝日判定用の変数を追加

// DOM要素の取得
document.addEventListener('DOMContentLoaded', () => {
    // 初期化処理
    initApp();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // 1秒ごとに時刻とカウントダウンを更新
    setInterval(updateTimeAndCountdown, 1000);
});

// アプリの初期化
function initApp() {
    // 現在時刻の表示
    updateCurrentTime();
    
    // 曜日タイプの表示
    updateDayType();
    
    // ローカルストレージからデータを読み込む
    loadDataFromLocalStorage();
    
    // データがなければ、CSVファイルを読み込む
    if (allRoutes.length === 0) {
        loadMultipleRoutes();
    } else {
        // バス情報を更新
        updateBusInfo();
    }
    
    // アコーディオンの初期化
    initAccordions();
    
    // 開発モードのチェック
    checkDevMode();
    
    // 祝日データの読み込み（追加）
    loadHolidayData();
}

// イベントリスナーの設定
function setupEventListeners() {
    // 更新ボタン
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', refreshData);
    }
    
    // ファイルアップロード（開発モード用）
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // アコーディオントグル
    document.querySelectorAll('.accordion').forEach(accordion => {
        accordion.addEventListener('click', function() {
            this.classList.toggle('active');
            const panel = this.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    });
}

// アコーディオンの初期化
function initAccordions() {
    // 今後のバスパネルを開いておく
    const upcomingToggle = document.getElementById('upcoming-buses-toggle');
    const upcomingPanel = document.getElementById('upcoming-buses-panel');
    if (upcomingToggle && upcomingPanel) {
        upcomingToggle.classList.add('active');
        upcomingPanel.style.maxHeight = upcomingPanel.scrollHeight + "px";
    }
    
    // バス乗り場案内パネルも開いておく
    const busStopMapToggle = document.getElementById('bus-stop-map-toggle');
    const busStopMapPanel = document.getElementById('bus-stop-map-panel');
    if (busStopMapToggle && busStopMapPanel) {
        busStopMapToggle.classList.add('active');
        busStopMapPanel.style.maxHeight = busStopMapPanel.scrollHeight + "px";
    }
}

// 開発モードのチェック
function checkDevMode() {
    // URLパラメータで開発モードを有効化
    const urlParams = new URLSearchParams(window.location.search);
    isDevMode = urlParams.has('dev');
    
    const uploadArea = document.getElementById('upload-area');
    if (isDevMode && uploadArea) {
        uploadArea.classList.add('show');
    }
}

// 現在時刻の更新
function updateCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const currentTimeElement = document.getElementById('current-time');
    if (currentTimeElement) {
        currentTimeElement.textContent = `${hours}:${minutes}`;
    }
}

// 曜日タイプの更新
function updateDayType() {
    const dayType = getCurrentDayType();
    const dayTypeElement = document.getElementById('day-type');
    if (dayTypeElement) {
        dayTypeElement.textContent = dayType;
    }
}

// 祝日データを読み込む
function loadHolidayData() {
    // 現在の年を取得
    const currentYear = new Date().getFullYear();
    
    // APIから今年と来年の祝日データを取得
    fetchHolidaysForYear(currentYear);
    fetchHolidaysForYear(currentYear + 1);
}

// 指定された年の祝日データを取得
function fetchHolidaysForYear(year) {
    // 日本の祝日APIのURL
    const apiUrl = `https://holidays-jp.github.io/api/v1/${year}/date.json`;
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('祝日データの取得に失敗しました');
            }
            return response.json();
        })
        .then(data => {
            // データをキャッシュに保存
            holidayCache = { ...holidayCache, ...data };
            holidayDataLoaded = true;
            console.log(`${year}年の祝日データを読み込みました`, Object.keys(data).length, '件');
            
            // UIを更新（曜日タイプが変わる可能性があるため）
            updateDayType();
            updateBusInfo();
        })
        .catch(error => {
            console.error('祝日APIエラー:', error);
            // APIエラー時はフォールバックを使用
            holidayDataLoaded = true;
        });
}

// 日付が祝日かどうかを判定する
function isJapaneseHoliday(date) {
    // 日付をYYYY/MM/DD形式に変換
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}/${mm}/${dd}`;
    
    // APIから取得したデータで祝日判定
    if (holidayDataLoaded && holidayCache[formattedDate]) {
        const holidayName = holidayCache[formattedDate];
        console.log(`祝日: ${holidayName}`);
        return true;
    }
    
    return false;
}

// 現在の曜日タイプを取得する関数（平日/土曜/休日）
function getCurrentDayType() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
    
    // 祝日判定
    if (isJapaneseHoliday(now)) {
        return "休日";
    }
    
    if (dayOfWeek === 0) {
        return "休日";
    } else if (dayOfWeek === 6) {
        return "土曜";
    } else {
        return "平日";
    }
}

// ローカルストレージからデータ読み込み
function loadDataFromLocalStorage() {
    const savedRoutes = localStorage.getItem('allRoutes');
    if (savedRoutes) {
        try {
            allRoutes = JSON.parse(savedRoutes);
            console.log('ローカルストレージからデータを読み込みました', allRoutes.length);
        } catch (e) {
            console.error('ローカルストレージのデータを解析できませんでした', e);
            allRoutes = [];
        }
    }
}

// CSVファイルをフェッチして読み込む
function loadRouteCSV(filename) {
    return fetch(filename)
        .then(response => {
            if (!response.ok) {
                throw new Error(`${filename}の読み込みに失敗: ${response.status}`);
            }
            return response.text();
        })
        .then(csvText => {
            return parseCSV(csvText, filename.split('.')[0]); // ファイル名から拡張子を除いたものをrouteIdとして使用
        });
}

// 複数のCSVファイルを読み込む
function loadMultipleRoutes() {
    console.log('CSVファイルを読み込みます...');
    
    // 読み込むファイルのリスト
    const routeFiles = [
        "川51.csv",
        "川55.csv",
        "川57.csv"
    ];
    
    // 全てのファイルを読み込む
    Promise.all(routeFiles.map(file => loadRouteCSV(file)))
        .then(results => {
            // 全てのルートデータを結合
            allRoutes = results.flat();
            
            // ローカルストレージに保存
            localStorage.setItem('allRoutes', JSON.stringify(allRoutes));
            
            // バス情報を更新
            updateBusInfo();
            console.log('全てのCSVファイルを読み込みました:', allRoutes.length);
        })
        .catch(error => {
            console.error('ファイル読み込みエラー:', error);
            // エラー時はサンプルデータを使用
            loadSampleData();
        });
}

// CSVデータをパースする
function parseCSV(csv, routeId) {
    const lines = csv.split('\n');
    const schedule = [];
    
    // 1行目をヘッダーとして扱い、スキップ
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // 空行をスキップ
        
        // カンマで分割
        const fields = line.split(',');
        
        // 必要なデータがあるかチェック (曜日区分,時間,分,系統,行先,乗り場)
        if (fields.length >= 6) {
            const dayType = fields[0].trim(); // 平日/土曜/休日
            const hour = parseInt(fields[1].trim());
            const minute = parseInt(fields[2].trim());
            const routeName = fields[3].trim();
            const destination = fields[4].trim();
            const busStop = fields[5].trim();
            
            // 24時間表記の時刻を作成
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            schedule.push({
                dayType: dayType,
                hour: hour,
                minute: minute,
                time: time,
                route: routeName,
                destination: destination,
                routeId: routeId,
                busStop: busStop
            });
        }
    }
    
    return schedule;
}

// ファイル選択でCSVを読み込む
function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    
    allRoutes = []; // リセット
    const filePromises = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const routeId = file.name.split('.')[0]; // ファイル名をrouteIdとして使用
        
        const promise = new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const csv = e.target.result;
                    const routeData = parseCSV(csv, routeId);
                    resolve(routeData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsText(file);
        });
        
        filePromises.push(promise);
    }
    
    Promise.all(filePromises)
        .then(results => {
            // 全てのルートデータを結合
            allRoutes = results.flat();
            
            // ローカルストレージに保存
            localStorage.setItem('allRoutes', JSON.stringify(allRoutes));
            
            // バス情報を更新
            updateBusInfo();
            
            console.log(`${files.length}個のCSVファイルを読み込みました:`, allRoutes.length);
        })
        .catch(error => {
            console.error('ファイル読み込みエラー:', error);
        });
}

// サンプルデータのロード（CSVの読み込みに失敗した場合）
function loadSampleData() {
    // サンプルデータ
    allRoutes = [
        { dayType: "平日", hour: 5, minute: 40, time: "05:40", route: "川51", destination: "新網島駅", routeId: "川51", busStop: "60" },
        { dayType: "平日", hour: 6, minute: 12, time: "06:12", route: "川51", destination: "新網島駅", routeId: "川51", busStop: "60" },
        { dayType: "平日", hour: 7, minute: 0, time: "07:00", route: "川51", destination: "新網島駅", routeId: "川51", busStop: "60" },
        { dayType: "平日", hour: 6, minute: 5, time: "06:05", route: "川55", destination: "小倉下町経由横須賀線小杉駅", routeId: "川55", busStop: "58" },
        { dayType: "平日", hour: 6, minute: 30, time: "06:30", route: "川55", destination: "小倉下町経由横須賀線小杉駅", routeId: "川55", busStop: "58" },
        { dayType: "平日", hour: 7, minute: 10, time: "07:10", route: "川55", destination: "小倉下町経由横須賀線小杉駅", routeId: "川55", busStop: "58" },
        { dayType: "平日", hour: 6, minute: 22, time: "06:22", route: "川57", destination: "末吉橋矢向循環線", routeId: "川57", busStop: "59" },
        { dayType: "平日", hour: 6, minute: 50, time: "06:50", route: "川57", destination: "末吉橋矢向循環線", routeId: "川57", busStop: "59" },
        { dayType: "平日", hour: 7, minute: 20, time: "07:20", route: "川57", destination: "末吉橋矢向循環線", routeId: "川57", busStop: "59" },
        { dayType: "土曜", hour: 6, minute: 13, time: "06:13", route: "川51", destination: "新網島駅", routeId: "川51", busStop: "60" },
        { dayType: "土曜", hour: 6, minute: 5, time: "06:05", route: "川55", destination: "小倉下町経由横須賀線小杉駅", routeId: "川55", busStop: "58" },
        { dayType: "土曜", hour: 6, minute: 22, time: "06:22", route: "川57", destination: "末吉橋矢向循環線", routeId: "川57", busStop: "59" },
        { dayType: "休日", hour: 6, minute: 13, time: "06:13", route: "川51", destination: "新網島駅", routeId: "川51", busStop: "60" },
        { dayType: "休日", hour: 6, minute: 5, time: "06:05", route: "川55", destination: "小倉下町経由横須賀線小杉駅", routeId: "川55", busStop: "58" },
        { dayType: "休日", hour: 6, minute: 22, time: "06:22", route: "川57", destination: "末吉橋矢向循環線", routeId: "川57", busStop: "59" }
    ];
    
    console.log('サンプルデータをロードしました', allRoutes.length);
    
    // バス情報を更新
    updateBusInfo();
}

// 1秒ごとにカウントダウンを更新する関数を修正
function updateTimeAndCountdown() {
    updateCurrentTime();
    updateCountdown();
    
    // 1分ごとにバス情報全体を更新（曜日が変わる可能性もあるため）
    const now = new Date();
    if (now.getSeconds() === 0) {
        updateDayType();
        updateBusInfo();
    }
}

// バス情報の更新
function updateBusInfo() {
    // 更新中なら早期リターン（無限ループ防止）
    if (isUpdatingInfo) return;
    
    isUpdatingInfo = true;
    
    try {
        // 次のバスを見つける（前後のバス含め、最大10件取得）
        const allUpcomingBuses = findAllSurroundingBuses();
        
        if (allUpcomingBuses.current.length > 0) {
            // 次のバス情報を表示
            displayNextBus(allUpcomingBuses.current[0]);
            
            // 今後のバスリストを表示
            displayUpcomingBuses(allUpcomingBuses.current);
            
            // 一本前のバスと次の次のバスを表示
            displayPreviousBus(allUpcomingBuses.previous[0]);
            displayNextNextBus(allUpcomingBuses.current[1]); // 次の次のバス
        } else {
            // バスがない場合
            displayNoBusesAvailable();
        }
    } catch (error) {
        console.error('バス情報の更新中にエラーが発生しました:', error);
        displayNoBusesAvailable();
    } finally {
        isUpdatingInfo = false;
    }
}

// 周辺のバスを全て見つける
function findAllSurroundingBuses() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayType = getCurrentDayType();
    
    console.log('現在の曜日タイプ:', currentDayType);
    
    // バスの型を正規化する（全角空白を取り除くなど）
    const normalizeType = (type) => {
        return type.replace(/\s+/g, '').trim();
    };
    
    // 現在の曜日タイプに合致するバスだけをフィルター（正規化済み）
    const todaysBuses = allRoutes.filter(bus => 
        normalizeType(bus.dayType) === normalizeType(currentDayType));
    
    console.log('利用可能なバス数:', todaysBuses.length);
    
    // データがない場合は空配列を返す
    if (todaysBuses.length === 0) {
        return { previous: [], current: [] };
    }
    
    // 時刻順にソートしたすべてのバス
    const sortedBuses = todaysBuses.sort((a, b) => {
        if (a.hour !== b.hour) {
            return a.hour - b.hour;
        }
        return a.minute - b.minute;
    });
    
    // 現在時刻より前のバス（一本前のバス）
    const previousBuses = sortedBuses.filter(bus => {
        return (bus.hour < currentHour) || 
               (bus.hour === currentHour && bus.minute < currentMinute);
    }).reverse().slice(0, 1); // 直近の1件だけ取得
    
    // 現在時刻以降のバス（次のバス、次の次のバス）
    const upcomingBuses = sortedBuses.filter(bus => {
        return (bus.hour > currentHour) || 
               (bus.hour === currentHour && bus.minute >= currentMinute);
    }).slice(0, 10); // 最大10件取得
    
    return {
        previous: previousBuses,
        current: upcomingBuses
    };
}

// 一本前のバスを表示
function displayPreviousBus(bus) {
    if (!bus) {
        // バス情報がない場合
        document.getElementById('prev-bus-route').textContent = '---';
        document.getElementById('prev-bus-route').className = 'route-badge';
        document.getElementById('prev-bus-destination').textContent = 'なし';
        document.getElementById('prev-bus-stop').textContent = '乗り場: --番';
        document.getElementById('prev-bus-time').textContent = '--:--';
        document.getElementById('prev-bus-passed').textContent = '';
        return;
    }
    
    // バス路線のバッジ
    const routeBadge = document.getElementById('prev-bus-route');
    if (routeBadge) {
        routeBadge.textContent = bus.route;
        routeBadge.className = `route-badge ${bus.route}`;
    }
    
    // 行先
    const destinationElement = document.getElementById('prev-bus-destination');
    if (destinationElement) {
        destinationElement.textContent = bus.destination;
    }
    
    // 乗り場
    const busStopElement = document.getElementById('prev-bus-stop');
    if (busStopElement) {
        busStopElement.textContent = `乗り場: ${bus.busStop}番`;
    }
    
    // 発車時刻
    const timeElement = document.getElementById('prev-bus-time');
    if (timeElement) {
        timeElement.textContent = bus.time;
    }
    
    // 何分前に発車したか計算
    const now = new Date();
    const departureTime = new Date();
    departureTime.setHours(bus.hour, bus.minute, 0);
    const minutesPassed = Math.floor((now - departureTime) / 60000);
    
    // 表示更新
    const minutesPassedElement = document.getElementById('prev-bus-passed');
    if (minutesPassedElement) {
        minutesPassedElement.textContent = `* ${minutesPassed}分前 発車`;
    }
}

// 次の次のバスを表示
function displayNextNextBus(bus) {
    if (!bus) {
        // バス情報がない場合
        document.getElementById('next-next-bus-route').textContent = '---';
        document.getElementById('next-next-bus-route').className = 'route-badge';
        document.getElementById('next-next-bus-destination').textContent = 'なし';
        document.getElementById('next-next-bus-stop').textContent = '乗り場: --番';
        document.getElementById('next-next-bus-time').textContent = '--:--';
        document.getElementById('next-next-bus-left').textContent = '';
        return;
    }
    
    // バス路線のバッジ
    const routeBadge = document.getElementById('next-next-bus-route');
    if (routeBadge) {
        routeBadge.textContent = bus.route;
        routeBadge.className = `route-badge ${bus.route}`;
    }
    
    // 行先
    const destinationElement = document.getElementById('next-next-bus-destination');
    if (destinationElement) {
        destinationElement.textContent = bus.destination;
    }
    
    // 乗り場
    const busStopElement = document.getElementById('next-next-bus-stop');
    if (busStopElement) {
        busStopElement.textContent = `乗り場: ${bus.busStop}番`;
    }
    
    // 発車時刻
    const timeElement = document.getElementById('next-next-bus-time');
    if (timeElement) {
        timeElement.textContent = bus.time;
    }
    
    // あと何分で発車するか計算
    const now = new Date();
    const departureTime = new Date();
    departureTime.setHours(bus.hour, bus.minute, 0);
    const minutesLeft = Math.floor((departureTime - now) / 60000);
    
    // 表示更新
    const minutesLeftElement = document.getElementById('next-next-bus-left');
    if (minutesLeftElement) {
        minutesLeftElement.textContent = `* あと${minutesLeft}分`;
    }
}

// 現在時刻以降のバスを見つける
function findUpcomingBuses(maxCount = 10) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayType = getCurrentDayType();
    
    // デバッグ情報を表示
    console.log('現在の曜日タイプ:', currentDayType);
    
    // 曜日タイプごとのデータ数をカウント
    const dayTypeCounts = {};
    allRoutes.forEach(bus => {
        const type = bus.dayType;
        dayTypeCounts[type] = (dayTypeCounts[type] || 0) + 1;
    });
    console.log('曜日タイプごとのデータ数:', dayTypeCounts);
    
    // 現在の曜日タイプに合致するバスだけをフィルター
    const todaysBuses = allRoutes.filter(bus => bus.dayType === currentDayType);
    console.log('利用可能なバス数:', todaysBuses.length);
    
    // データがない場合はサンプルデータを使用
    if (todaysBuses.length === 0 && allRoutes.length > 0) {
        console.log('指定された曜日タイプのデータがないため、全データを対象にします');
        return allRoutes
            .sort((a, b) => {
                if (a.hour !== b.hour) {
                    return a.hour - b.hour;
                }
                return a.minute - b.minute;
            })
            .slice(0, maxCount);
    }
    
    // 現在時刻以降のバスをフィルタリング
    const upcomingBuses = todaysBuses.filter(bus => {
        return (bus.hour > currentHour) || 
               (bus.hour === currentHour && bus.minute >= currentMinute);
    });
    
    // 時刻順にソート
    const sortedBuses = upcomingBuses.sort((a, b) => {
        if (a.hour !== b.hour) {
            return a.hour - b.hour;
        }
        return a.minute - b.minute;
    });
    
    // 指定件数に制限
    return sortedBuses.slice(0, maxCount);
}

// 次のバスを表示
function displayNextBus(bus) {
    // バス路線のバッジ
    const routeBadge = document.getElementById('next-bus-route');
    if (routeBadge) {
        routeBadge.textContent = bus.route;
        routeBadge.className = `route-badge ${bus.route}`;
    }
    
    // 乗り場情報を追加
    const busStopElement = document.getElementById('next-bus-stop');
    if (busStopElement) {
        busStopElement.textContent = `乗り場: ${bus.busStop}番`;
    }
    
    // 行先
    const destinationElement = document.getElementById('next-bus-destination');
    if (destinationElement) {
        destinationElement.textContent = bus.destination;
    }
    
    // 発車時刻
    const timeElement = document.getElementById('next-bus-time');
    if (timeElement) {
        timeElement.textContent = bus.time;
    }
    
    // カウントダウン初期化
    updateCountdown();

    // 乗り場をハイライト表示
    highlightBusStop(bus.busStop);
}

// 今後のバスリストを表示
function displayUpcomingBuses(buses) {
    const busList = document.getElementById('bus-list');
    if (!busList) return;
    
    busList.innerHTML = ''; // リストをクリア
    
    const now = new Date();
    
    // バスを表示
    for (let i = 0; i < buses.length; i++) {
        const bus = buses[i];
        
        const busItem = document.createElement('div');
        busItem.className = 'bus-item';
        
        // バス発車時刻
        const busTime = document.createElement('div');
        busTime.className = 'bus-time';
        busTime.textContent = bus.time;
        
        // バス路線情報
        const busRouteInfo = document.createElement('div');
        busRouteInfo.className = 'bus-route-info';
        
        const routeBadge = document.createElement('span');
        routeBadge.className = `route-badge ${bus.route}`;
        routeBadge.textContent = bus.route;
        
        busRouteInfo.appendChild(routeBadge);
        busRouteInfo.appendChild(document.createTextNode(` ${bus.destination} `));
        
        // 乗り場情報を追加
        const busStopInfo = document.createElement('span');
        busStopInfo.className = 'bus-stop-info';
        busStopInfo.textContent = `乗り場: ${bus.busStop}番`;
        busRouteInfo.appendChild(busStopInfo);
        
        // 残り時間
        const departureTime = new Date();
        departureTime.setHours(bus.hour, bus.minute, 0);
        const minutesLeft = Math.floor((departureTime - now) / 60000);
        
        const minutesLeftSpan = document.createElement('div');
        minutesLeftSpan.className = 'minutes-left';
        minutesLeftSpan.textContent = `あと${minutesLeft}分`;
        
        // 要素を追加
        busItem.appendChild(busTime);
        busItem.appendChild(busRouteInfo);
        busItem.appendChild(minutesLeftSpan);
        
        busList.appendChild(busItem);
    }
    
    // パネルの高さを更新
    const panel = document.getElementById('upcoming-buses-panel');
    if (panel && panel.style.maxHeight) {
        panel.style.maxHeight = panel.scrollHeight + "px";
    }
}

// バスがない場合の表示
function displayNoBusesAvailable() {
    // 次のバス情報をリセット
    const nextBusRoute = document.getElementById('next-bus-route');
    if (nextBusRoute) {
        nextBusRoute.textContent = '---';
        nextBusRoute.className = 'route-badge';
    }
    
    const nextBusDestination = document.getElementById('next-bus-destination');
    if (nextBusDestination) {
        nextBusDestination.textContent = '本日の運行は終了しました';
    }
    
    const nextBusTime = document.getElementById('next-bus-time');
    if (nextBusTime) {
        nextBusTime.textContent = '--:--';
    }
    
    const countdown = document.getElementById('countdown');
    if (countdown) {
        countdown.textContent = '--:--:--';
    }
    
    // バスリストをクリア
    const busList = document.getElementById('bus-list');
    if (busList) {
        busList.innerHTML = '<div class="bus-item">本日の運行は終了しました</div>';
    }
}


// カウントダウンの更新
function updateCountdown() {
    if (isUpdatingInfo) return; // 無限ループ防止
    
    const upcomingBuses = findAllSurroundingBuses().current;
    
    if (upcomingBuses.length > 0) {
        const nextBus = upcomingBuses[0];
        const now = new Date();
        
        // 次のバスの出発時刻
        const departureTime = new Date();
        departureTime.setHours(nextBus.hour, nextBus.minute, 0);
        
        // 時間差（ミリ秒）
        const timeDiff = departureTime - now;
        
        // カウントダウン表示を更新
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
            if (timeDiff > 0) {
                // 時間、分、秒に変換
                const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
                
                // 1時間以上の場合は --:-- と表示
                if (hours >= 1) {
                    countdownElement.textContent = '--:--';
                    countdownElement.classList.remove('blink', 'departed');
                } else {
                    // 1時間未満の場合は分:秒形式で表示
                    const formattedMinutes = String(minutes).padStart(2, '0');
                    const formattedSeconds = String(seconds).padStart(2, '0');
                    
                    countdownElement.textContent = `${formattedMinutes}:${formattedSeconds}`;
                    
                    // 残り時間が10秒以下になったら点滅させる
                    if (timeDiff <= 10000) {
                        countdownElement.classList.add('blink');
                    } else {
                        countdownElement.classList.remove('blink');
                    }
                }
            } else {
                // 発車時刻を過ぎた場合
                countdownElement.textContent = '発車済み';
                countdownElement.classList.add('departed');
                
                // 3秒後に次のバスへ更新
                setTimeout(() => {
                    // バス情報を再取得して表示
                    updateBusInfo();
                    
                    // 点滅・発車済みクラスを削除
                    countdownElement.classList.remove('blink', 'departed');
                }, 3000);
            }
        }
    } else {
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
            countdownElement.textContent = '--:--';
            countdownElement.classList.remove('blink', 'departed');
        }
    }
}


// データ更新（リフレッシュ）
function refreshData() {
    // アニメーションなどの視覚効果を追加
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = '更新中...';
    }
    
    // 現在時刻を更新
    updateCurrentTime();
    updateDayType();
    
    // バス情報を更新
    updateBusInfo();
    
    // 更新完了後にボタンを元に戻す
    setTimeout(() => {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.innerHTML = `
                <svg class="refresh-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 4v6h-6"></path>
                    <path d="M1 20v-6h6"></path>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                    <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                更新完了
            `;
            
            // 少しして元のテキストに戻す
            setTimeout(() => {
                refreshButton.innerHTML = `
                    <svg class="refresh-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M23 4v6h-6"></path>
                        <path d="M1 20v-6h6"></path>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                        <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    更新する
                `;
            }, 1000);
        }
    }, 500);
}

// マップ強調表示用
function highlightBusStop(busStopNumber) {
    const overlay = document.getElementById('bus-stop-highlight-overlay');
    const infoText = document.getElementById('bus-stop-highlight-info');
    
    if (!overlay || !infoText) return;
    
    // 情報テキストを更新
    infoText.textContent = `${busStopNumber}番乗り場`;
    
    // 乗り場番号に基づいて位置を設定
    // 注: 以下の座標は例です。実際の画像に合わせて調整してください
    const positions = {
        '58': { top: '41%', left: '38%' },  // 川55の乗り場
        '59': { top: '42%', left: '32%' },  // 川57の乗り場
        '60': { top: '45%', left: '25%' }   // 川51の乗り場
    };
    
    if (positions[busStopNumber]) {
        // 該当する乗り場の位置が定義されている場合
        overlay.style.display = 'block';
        overlay.style.top = positions[busStopNumber].top;
        overlay.style.left = positions[busStopNumber].left;
    } else {
        // 未定義の乗り場の場合は非表示
        overlay.style.display = 'none';
    }
}