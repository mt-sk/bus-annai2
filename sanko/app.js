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
    
    // 開発モードのチェック
    checkDevMode();
    
    // 祝日データの読み込み
    loadHolidayData();
}

// イベントリスナーの設定
function setupEventListeners() {
    // ファイルアップロード（開発モード用）
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
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

// 複数のCSVファイルを読み込む（新しいファイル構成に対応）
function loadMultipleRoutes() {
    console.log('CSVファイルを読み込みます...');
    
    // 読み込むファイルのリスト
    const routeFiles = [
        "矢向西町.csv",
        "新鶴見小学校南.csv"
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

// サンプルデータのロード（新しいデータ構成に対応）
function loadSampleData() {
    // サンプルデータ
    allRoutes = [
        { dayType: "平日", hour: 6, minute: 2, time: "06:02", route: "川51、53、56", destination: "矢向西町→川崎駅", routeId: "矢向西町", busStop: "矢向西町" },
        { dayType: "平日", hour: 6, minute: 28, time: "06:28", route: "川51、53、56", destination: "矢向西町→川崎駅", routeId: "矢向西町", busStop: "矢向西町" },
        { dayType: "平日", hour: 7, minute: 5, time: "07:05", route: "川51、53、56", destination: "矢向西町→川崎駅", routeId: "矢向西町", busStop: "矢向西町" },
        { dayType: "平日", hour: 6, minute: 4, time: "06:04", route: "川54、55", destination: "新鶴見小学校南→川崎駅", routeId: "新鶴見小学校南", busStop: "新鶴見小学校南" },
        { dayType: "平日", hour: 6, minute: 19, time: "06:19", route: "川54、55", destination: "新鶴見小学校南→川崎駅", routeId: "新鶴見小学校南", busStop: "新鶴見小学校南" },
        { dayType: "平日", hour: 7, minute: 15, time: "07:15", route: "川54、55", destination: "新鶴見小学校南→川崎駅", routeId: "新鶴見小学校南", busStop: "新鶴見小学校南" },
        { dayType: "土曜", hour: 6, minute: 10, time: "06:10", route: "川51、53、56", destination: "矢向西町→川崎駅", routeId: "矢向西町", busStop: "矢向西町" },
        { dayType: "土曜", hour: 6, minute: 12, time: "06:12", route: "川54、55", destination: "新鶴見小学校南→川崎駅", routeId: "新鶴見小学校南", busStop: "新鶴見小学校南" },
        { dayType: "休日", hour: 6, minute: 15, time: "06:15", route: "川51、53、56", destination: "矢向西町→川崎駅", routeId: "矢向西町", busStop: "矢向西町" },
        { dayType: "休日", hour: 6, minute: 20, time: "06:20", route: "川54、55", destination: "新鶴見小学校南→川崎駅", routeId: "新鶴見小学校南", busStop: "新鶴見小学校南" }
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

// 乗り場別にバスを分類する
function getBusesByBusStop() {
    // CSVファイル名（routeId）で分類
    const yakoNishiBuses = allRoutes.filter(bus => bus.routeId === "矢向西町");
    const shinTsurumiBuses = allRoutes.filter(bus => bus.routeId === "新鶴見小学校南");
    
    return {
        yako: yakoNishiBuses,
        shin: shinTsurumiBuses
    };
}

// 乗り場ごとの周辺バスを取得（1本前のバス除去）
function findSurroundingBusesForStop(buses) {
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
    const todaysBuses = buses.filter(bus => 
        normalizeType(bus.dayType) === normalizeType(currentDayType));
    
    console.log('利用可能なバス数:', todaysBuses.length);
    
    // データがない場合は空配列を返す
    if (todaysBuses.length === 0) {
        return { current: [] };
    }
    
    // 時刻順にソートしたすべてのバス
    const sortedBuses = todaysBuses.sort((a, b) => {
        if (a.hour !== b.hour) {
            return a.hour - b.hour;
        }
        return a.minute - b.minute;
    });
    
    // 現在時刻以降のバス（次のバス、次の次のバス）
    const upcomingBuses = sortedBuses.filter(bus => {
        return (bus.hour > currentHour) || 
               (bus.hour === currentHour && bus.minute >= currentMinute);
    }).slice(0, 10); // 最大10件取得
    
    return {
        current: upcomingBuses
    };
}

// バス情報の更新
function updateBusInfo() {
    // 更新中なら早期リターン（無限ループ防止）
    if (isUpdatingInfo) return;
    
    isUpdatingInfo = true;
    
    try {
        const busesByStop = getBusesByBusStop();
        
        // 矢向西町のバス情報更新
        const yakoSurrounding = findSurroundingBusesForStop(busesByStop.yako);
        updateBusStopInfo('yako', yakoSurrounding);
        
        // 新鶴見小学校前のバス情報更新
        const shinSurrounding = findSurroundingBusesForStop(busesByStop.shin);
        updateBusStopInfo('shin', shinSurrounding);
        
        // シンプル化したオーバーレイの更新
        updateSimpleOverlays();
        
        // バス時刻表の更新
        updateBusScheduleList('yako', busesByStop.yako);
        updateBusScheduleList('shin', busesByStop.shin);
        
    } catch (error) {
        console.error('バス情報の更新中にエラーが発生しました:', error);
        displayNoBusesAvailable('yako');
        displayNoBusesAvailable('shin');
    } finally {
        isUpdatingInfo = false;
    }
}

// シンプル化したオーバーレイ更新関数
function updateSimpleOverlays() {
    const busesByStop = getBusesByBusStop();
    
    // 矢向西町の次のバス
    const yakoSurrounding = findSurroundingBusesForStop(busesByStop.yako);
    if (yakoSurrounding.current.length > 0) {
        updateSimpleOverlay('yako', yakoSurrounding.current[0]);
    } else {
        clearOverlay('yako');
    }
    
    // 新鶴見小学校南の次のバス
    const shinSurrounding = findSurroundingBusesForStop(busesByStop.shin);
    if (shinSurrounding.current.length > 0) {
        updateSimpleOverlay('shin', shinSurrounding.current[0]);
    } else {
        clearOverlay('shin');
    }
}

// シンプルなオーバーレイ更新（単一バス停用）
function updateSimpleOverlay(stopId, bus) {
    const overlayCountdown = document.getElementById(`${stopId}-overlay-countdown`);
    const overlayRoute = document.getElementById(`${stopId}-overlay-route`);
    
    if (!overlayCountdown || !overlayRoute) return;
    
    if (bus) {
        const now = new Date();
        const departureTime = new Date();
        departureTime.setHours(bus.hour, bus.minute, 0);
        const timeDiff = departureTime - now;
        
        if (timeDiff > 0) {
            const minutes = Math.floor(timeDiff / (1000 * 60));
            overlayCountdown.textContent = `${minutes}分後`;
            overlayRoute.textContent = bus.route;
        } else {
            overlayCountdown.textContent = '発車済み';
            overlayRoute.textContent = bus.route;
        }
    } else {
        clearOverlay(stopId);
    }
}

// オーバーレイをクリア
function clearOverlay(stopId) {
    const overlayCountdown = document.getElementById(`${stopId}-overlay-countdown`);
    const overlayRoute = document.getElementById(`${stopId}-overlay-route`);
    
    if (overlayCountdown) overlayCountdown.textContent = '--:--';
    if (overlayRoute) overlayRoute.textContent = '---';
}

// 乗り場ごとのバス情報を更新
function updateBusStopInfo(stopId, surroundingBuses) {
    if (surroundingBuses.current.length > 0) {
        displayNextBus(stopId, surroundingBuses.current[0]);
        displayNextNextBus(stopId, surroundingBuses.current[1]);
        
        // 徒歩7分判定を追加
        applyWalkingTimeRecommendation(stopId, surroundingBuses.current);
    } else {
        displayNoBusesAvailable(stopId);
    }
}

// 徒歩7分を考慮したおすすめ判定（3段階判定に変更）
function applyWalkingTimeRecommendation(stopId, upcomingBuses) {
    const WALKING_TIME_MINUTES = 7; // 徒歩7分
    const BUFFER_MINUTES = 1; // 余裕時間1分
    const REQUIRED_TIME = WALKING_TIME_MINUTES + BUFFER_MINUTES; // 合計8分必要
    const RUSH_TIME = 5; // 急げば間に合う時間
    const MAX_RECOMMEND_TIME = 12; // おすすめ表示の最大時間
    
    const now = new Date();
    
    // 次のバスと次の次のバスの要素を取得
    const nextBusContainer = document.getElementById(`next-bus-container-${stopId}`);
    const nextNextBusContainer = document.getElementById(`next-next-bus-${stopId}`);
    
    if (!nextBusContainer || !nextNextBusContainer) return;
    
    // まずは全てのクラスをリセット
    nextBusContainer.classList.remove('recommended-bus', 'too-late', 'rush-possible');
    nextNextBusContainer.classList.remove('recommended-bus', 'too-late', 'rush-possible');
    
    // 最大3台のバスを判定対象とする
    const busesToCheck = upcomingBuses.slice(0, 3);
    let recommendedBusIndex = -1;
    
    // 間に合うバスを探す（8分～12分のバスを優先）
    for (let i = 0; i < busesToCheck.length; i++) {
        const bus = busesToCheck[i];
        const departureTime = new Date();
        departureTime.setHours(bus.hour, bus.minute, 0);
        const minutesUntilDeparture = Math.floor((departureTime - now) / 60000);
        
        // 8分～12分の範囲のバスを「おすすめ」として選択
        if (minutesUntilDeparture >= REQUIRED_TIME && minutesUntilDeparture <= MAX_RECOMMEND_TIME) {
            recommendedBusIndex = i;
            break;
        }
    }
    
    // 判定結果を表示に反映
    if (recommendedBusIndex === 0) {
        // 次のバスがおすすめ範囲（8分～12分）内
        nextBusContainer.classList.add('recommended-bus');
    } else if (recommendedBusIndex === 1) {
        // 次の次のバスがおすすめ範囲内
        const nextBus = busesToCheck[0];
        const nextDepartureTime = new Date();
        nextDepartureTime.setHours(nextBus.hour, nextBus.minute, 0);
        const nextMinutes = Math.floor((nextDepartureTime - now) / 60000);
        
        if (nextMinutes < RUSH_TIME) {
            // 次のバスが5分未満なら間に合わない
            nextBusContainer.classList.add('too-late');
        } else if (nextMinutes < REQUIRED_TIME) {
            // 次のバスが5分～8分なら急げば間に合う
            nextBusContainer.classList.add('rush-possible');
        }
        
        // 次の次のバスがおすすめ範囲内
        nextNextBusContainer.classList.add('recommended-bus');
    } else {
        // おすすめバスがない場合、通常の判定
        if (busesToCheck.length > 0) {
            const nextBus = busesToCheck[0];
            const nextDepartureTime = new Date();
            nextDepartureTime.setHours(nextBus.hour, nextBus.minute, 0);
            const nextMinutes = Math.floor((nextDepartureTime - now) / 60000);
            
            if (nextMinutes < RUSH_TIME) {
                // 5分未満なら間に合わない
                nextBusContainer.classList.add('too-late');
            } else if (nextMinutes < REQUIRED_TIME) {
                // 5分～8分なら急げば間に合う
                nextBusContainer.classList.add('rush-possible');
            }
            // 8分以上12分未満ならクラス追加なし（標準表示：青）
        }
        
        if (upcomingBuses[1]) {
            const nextNextBus = upcomingBuses[1];
            const nextNextDepartureTime = new Date();
            nextNextDepartureTime.setHours(nextNextBus.hour, nextNextBus.minute, 0);
            const nextNextMinutes = Math.floor((nextNextDepartureTime - now) / 60000);
            
            if (nextNextMinutes < RUSH_TIME) {
                // 5分未満なら間に合わない
                nextNextBusContainer.classList.add('too-late');
            } else if (nextNextMinutes < REQUIRED_TIME) {
                // 5分～8分なら急げば間に合う
                nextNextBusContainer.classList.add('rush-possible');
            }
            // 8分以上12分未満ならクラス追加なし（標準表示：青）
        }
    }
    
    // おすすめバス情報を返す（他の乗り場との比較用）
    return recommendedBusIndex >= 0 ? upcomingBuses[recommendedBusIndex] : null;
}

// 次のバスを表示（乗り場別）
function displayNextBus(stopId, bus) {
    // バス路線のバッジ
    const routeBadge = document.getElementById(`next-bus-route-${stopId}`);
    if (routeBadge) {
        routeBadge.textContent = bus.route;
        routeBadge.className = `route-badge ${bus.route}`;
    }
    
    // 乗り場情報を追加
    const busStopElement = document.getElementById(`next-bus-stop-${stopId}`);
    if (busStopElement) {
        busStopElement.textContent = `乗り場: ${bus.busStop}`;
    }
    
    // 発車時刻
    const timeElement = document.getElementById(`next-bus-time-${stopId}`);
    if (timeElement) {
        timeElement.textContent = bus.time;
    }
    
    // カウントダウン初期化
    updateCountdown();
}

// 次の次のバスを表示（乗り場別）
function displayNextNextBus(stopId, bus) {
    if (!bus) {
        // バス情報がない場合
        document.getElementById(`next-next-bus-route-${stopId}`).textContent = '---';
        document.getElementById(`next-next-bus-route-${stopId}`).className = 'route-badge';
        document.getElementById(`next-next-bus-time-${stopId}`).textContent = '--:--';
        document.getElementById(`next-next-bus-left-${stopId}`).textContent = '';
        return;
    }
    
    // バス路線のバッジ
    const routeBadge = document.getElementById(`next-next-bus-route-${stopId}`);
    if (routeBadge) {
        routeBadge.textContent = bus.route;
        routeBadge.className = `route-badge ${bus.route}`;
    }
    
    // 発車時刻
    const timeElement = document.getElementById(`next-next-bus-time-${stopId}`);
    if (timeElement) {
        timeElement.textContent = bus.time;
    }
    
    // あと何分で発車するか計算
    const now = new Date();
    const departureTime = new Date();
    departureTime.setHours(bus.hour, bus.minute, 0);
    const minutesLeft = Math.floor((departureTime - now) / 60000);
    
    // 表示更新
    const minutesLeftElement = document.getElementById(`next-next-bus-left-${stopId}`);
    if (minutesLeftElement) {
        minutesLeftElement.textContent = `* あと${minutesLeft}分`;
    }
}

// バスがない場合の表示（乗り場別）
function displayNoBusesAvailable(stopId) {
    // 次のバス情報をリセット
    const nextBusRoute = document.getElementById(`next-bus-route-${stopId}`);
    if (nextBusRoute) {
        nextBusRoute.textContent = '---';
        nextBusRoute.className = 'route-badge';
    }
    
    const nextBusDestination = document.getElementById(`next-bus-destination-${stopId}`);
    if (nextBusDestination) {
        nextBusDestination.textContent = '本日の運行は終了しました';
    }
    
    const nextBusTime = document.getElementById(`next-bus-time-${stopId}`);
    if (nextBusTime) {
        nextBusTime.textContent = '--:--';
    }
    
    const countdown = document.getElementById(`countdown-${stopId}`);
    if (countdown) {
        countdown.textContent = '--:--:--';
    }
}

// カウントダウンの更新（両方の乗り場）
function updateCountdown() {
    if (isUpdatingInfo) return; // 無限ループ防止
    
    const busesByStop = getBusesByBusStop();
    
    // 矢向西町のカウントダウン更新
    const yakoSurrounding = findSurroundingBusesForStop(busesByStop.yako);
    updateCountdownForStop('yako', yakoSurrounding.current);
    
    // 新鶴見小学校前のカウントダウン更新
    const shinSurrounding = findSurroundingBusesForStop(busesByStop.shin);
    updateCountdownForStop('shin', shinSurrounding.current);
    
    // オーバーレイも更新（シンプル版）
    updateSimpleOverlays();
}

// 乗り場別カウントダウン更新
function updateCountdownForStop(stopId, upcomingBuses) {
    const countdownElement = document.getElementById(`countdown-${stopId}`);
    if (!countdownElement) return;
    
    if (upcomingBuses.length > 0) {
        const nextBus = upcomingBuses[0];
        const now = new Date();
        
        // 次のバスの出発時刻
        const departureTime = new Date();
        departureTime.setHours(nextBus.hour, nextBus.minute, 0);
        
        // 時間差（ミリ秒）
        const timeDiff = departureTime - now;
        
        // カウントダウン表示を更新
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
    } else {
        countdownElement.textContent = '--:--';
        countdownElement.classList.remove('blink', 'departed');
    }
}

// バス時刻表の更新
function updateBusScheduleList(stopId, buses) {
    const scheduleListElement = document.getElementById(`${stopId}-schedule-list`);
    if (!scheduleListElement) return;
    
    // 現在の日付と時刻
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayType = getCurrentDayType();
    
    // バスの型を正規化する（全角空白を取り除くなど）
    const normalizeType = (type) => {
        return type.replace(/\s+/g, '').trim();
    };
    
    // 現在の曜日タイプに合致するバスだけをフィルター（正規化済み）
    const todaysBuses = buses.filter(bus => 
        normalizeType(bus.dayType) === normalizeType(currentDayType));
    
    // データがない場合は「バスはありません」と表示
    if (todaysBuses.length === 0) {
        scheduleListElement.innerHTML = '<div class="bus-schedule-loading">本日の運行データはありません</div>';
        return;
    }
    
    // 時刻順にソート
    const sortedBuses = todaysBuses.sort((a, b) => {
        if (a.hour !== b.hour) {
            return a.hour - b.hour;
        }
        return a.minute - b.minute;
    });
    
    // 発車済みのバス（最新の1本のみ）と発車予定のバス（最大4本）を取得
    const departedBuses = [];
    const upcomingBuses = [];
    
    // 発車済みバスを時刻の降順で取得
    const departedSorted = sortedBuses
        .filter(bus => {
            const departureTime = new Date();
            departureTime.setHours(bus.hour, bus.minute, 0);
            return departureTime <= now;
        })
        .sort((a, b) => {
            // 時刻の降順（最新のものが最初）
            if (a.hour !== b.hour) {
                return b.hour - a.hour;
            }
            return b.minute - a.minute;
        });
    
    // 最新の発車済みバス1本だけを取得
    if (departedSorted.length > 0) {
        const latestDeparted = departedSorted[0];
        const departureTime = new Date();
        departureTime.setHours(latestDeparted.hour, latestDeparted.minute, 0);
        departedBuses.push({...latestDeparted, timeDiff: departureTime - now});
    }
    
    // 発車予定のバス（最大4本）
    sortedBuses.forEach(bus => {
        const departureTime = new Date();
        departureTime.setHours(bus.hour, bus.minute, 0);
        const timeDiff = departureTime - now;
        
        if (timeDiff > 0 && upcomingBuses.length < 4) {
            upcomingBuses.push({...bus, timeDiff});
        }
    });
    
    // 表示するバスリスト（発車済み + 発車予定）
    const displayBuses = [...departedBuses, ...upcomingBuses];
    
    // HTMLを構築
    let html = '';
    displayBuses.forEach(bus => {
        // 発車までの時間（分）または発車してからの時間（分）
        const minutesUntilDeparture = Math.floor(Math.abs(bus.timeDiff) / (1000 * 60));
        
        // ステータスの決定
        let statusClass = '';
        let countdownText = '';
        
        if (bus.timeDiff <= 0) {
            // 発車済み
            statusClass = 'departed';
            countdownText = `発車済み`;
        } else if (minutesUntilDeparture <= 5) {
            // 間もなく（5分以内）
            statusClass = 'soon';
            countdownText = `あと${minutesUntilDeparture}分`;
        } else if (minutesUntilDeparture < 8) {
            // 急げば間に合う（5-8分）
            statusClass = 'soon';
            countdownText = `あと${minutesUntilDeparture}分`;
        } else if (minutesUntilDeparture >= 8 && minutesUntilDeparture <= 12) {
            // おすすめ（8-12分）
            statusClass = 'recommend';
            countdownText = `あと${minutesUntilDeparture}分`;
        } else {
            // 12分超
            statusClass = 'plenty';
            countdownText = `あと${minutesUntilDeparture}分`;
        }
        
        html += `
            <div class="bus-schedule-item ${statusClass}">
                <div class="bus-schedule-time">${bus.time}</div>
                <div class="bus-schedule-countdown">${countdownText}</div>
            </div>
        `;
    });
    
    // HTMLを挿入
    scheduleListElement.innerHTML = html || '<div class="bus-schedule-loading">本日の運行データはありません</div>';
}