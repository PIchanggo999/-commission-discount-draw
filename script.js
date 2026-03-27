const ACCESS_PASSWORD = "2026";
const ADMIN_PASSWORD = "0830";

const firebaseConfig = {
  apiKey: "AIzaSy...", 
  authDomain: "commission-discount-draw.firebaseapp.com",
  databaseURL: "https://commission-discount-draw-default-rtdb.firebaseio.com",
  projectId: "commission-discount-draw",
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let used = {};
let prizes = [];

const defaultPrizes = [
    { name: "★15000원 할인★", weight: 1, stock: 1 },
    { name: "5000원 할인", weight: 4, stock: 4 },
    { name: "3000원 할인", weight: 10, stock: 10 },
    { name: "1000원 할인", weight: 15, stock: 15 },
    { name: "꽝", weight: 20, stock: 20 }
];

function checkAccess(){
  if(document.getElementById("accessPw").value !== ACCESS_PASSWORD) return alert("비밀번호가 틀렸습니다.");
  document.getElementById("lockScreen").style.display = "none";
  document.getElementById("realContent").style.display = "flex";
  renderBoard();
}

function login(){
  if(document.getElementById("pw").value !== ADMIN_PASSWORD) return alert("비밀번호 불일치");
  document.getElementById("adminLogin").style.display = "none";
  document.getElementById("adminPanel").style.display = "flex";
  loadLogs();
}

db.ref("state").on("value", snap => {
  let data = snap.val();
  if(!data) {
    db.ref("state").set({ prizes: defaultPrizes, used: {} });
    return;
  }
  used = data.used || {};
  prizes = data.prizes || [];
  
  if(document.getElementById("board")) renderBoard();
  if(document.getElementById("adminBoard")) renderAdminBoard();
  updateStockUI();
  if(document.getElementById("adminStock")) renderAdminStockControl();
});

// 사용자 메인 페이지 최근 기록 문구 변경
db.ref("logs").orderByKey().limitToLast(1).on("value", snap => {
    const recentLogDiv = document.getElementById("recentLog");
    if(!recentLogDiv) return;
    
    let data = snap.val();
    if(data) {
        let key = Object.keys(data)[0];
        let latest = data[key];
        
        if(latest.prize === "꽝") {
            recentLogDiv.innerText = `☞ ${latest.name}님 ${latest.prize}! 다음 기회에! (*￣3￣)╭`;
        } else {
            recentLogDiv.innerText = `☞ ${latest.name}님이 ${latest.prize}에 당첨 되셨습니다! ( •̀ .̫ •́ )✧`;
        }
    } else {
        recentLogDiv.innerText = "[LOG] 대기 중... SYSTEM STANDBY";
    }
});

function renderBoard(){
  const board = document.getElementById("board");
  if(!board) return;
  board.innerHTML = "";
  for(let i=1; i<=50; i++){
    let d = document.createElement("div");
    d.className = "slot cyber-border";
    d.setAttribute("data-num", i); 
    if(used[i]) {
        d.classList.add("selected");
        d.innerText = "ERROR";
    } else {
        d.innerText = i;
        d.onclick = () => { 
            document.querySelectorAll('.slot').forEach(s => s.classList.remove('active'));
            d.classList.add('active');
            document.getElementById("number").value = i; 
        };
    }
    board.appendChild(d);
  }
}

function renderAdminBoard(){
  const board = document.getElementById("adminBoard");
  if(!board) return;
  board.innerHTML = "";
  for(let i=1; i<=50; i++){
    let d = document.createElement("div");
    d.className = "slot admin-slot cyber-border";
    if(used[i]) {
        d.classList.add("selected-admin");
        d.innerHTML = `<span class="slot-num">${i}</span><div class="slot-info">${used[i].name}<br><b>${used[i].prize}</b></div>`;
        d.onclick = () => resetSpecificSlot(i);
    } else {
        d.innerHTML = `<span class="slot-num">${i}</span>`;
    }
    board.appendChild(d);
  }
}

function draw(){
  const name = document.getElementById("name").value.trim();
  let number = parseInt(document.getElementById("number").value);

  if(!name) return alert("닉네임을 입력해주세요!");
  if(!number) return alert("번호를 선택해주세요!");
  if(used[number]) return alert("이미 선택된 번호입니다.");

  let available = prizes.filter(p => p.stock > 0);
  if(available.length === 0) return alert("모든 상품이 소진되었습니다.");

  const btn = document.querySelector('.draw-btn');
  if(btn) {
      btn.classList.add('cyberpop-active');
      setTimeout(() => btn.classList.remove('cyberpop-active'), 500);
  }

  let total = available.reduce((a, b) => a + parseInt(b.weight), 0);
  let rand = Math.random() * total;
  let selected;
  for(let p of available){
    rand -= p.weight;
    if(rand <= 0){ selected = p; break; }
  }

  prizes.find(p => p.name === selected.name).stock--;
  used[number] = { name: name, prize: selected.name };

  db.ref("state").set({prizes, used});
  db.ref("logs").push({ name, number, prize: selected.name, time: new Date().toLocaleString('ko-KR') });

  setTimeout(() => {
      showResult(name, selected.name);
      document.getElementById("number").value = "";
  }, 400); // 버튼 애니메이션을 위해 약간의 딜레이
}

function playSound(url) {
    const audio = new Audio(url);
    audio.volume = 0.3; 
    audio.play().catch(e => console.log("오디오 재생 차단됨:", e));
}

function showResult(name, prize) {
    const popup = document.getElementById("drawPopup");
    const resultText = document.getElementById("resultText");
    popup.style.display = "flex";

    if (prize === "꽝") {
        playSound("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3"); 
        resultText.innerHTML = `<span style="color:#02F0FF; font-family:'Orbitron',sans-serif;">[ ${name} ] RESULT</span><br><b style="color:#FD23F6; font-size:4rem; text-shadow: 0 0 20px #FD23F6;">꽝...</b>`;
    } else if (prize === "★15000원 할인★") {
        playSound("https://assets.mixkit.co/active_storage/sfx/2350/2350-preview.mp3"); 
        resultText.innerHTML = `<span style="color:#B0FF2D; font-family:'Orbitron',sans-serif;">JACKPOT! [ ${name} ]</span><br><b style="color:#FD23F6; font-size:4.5rem; text-shadow: 0 0 20px #FD23F6;">${prize}</b>`;
        if (window.confetti) confetti({ particleCount: 250, spread: 100, origin: { y: 0.6 }, colors: ['#FD23F6', '#02F0FF', '#E8FF06'] });
    } else {
        playSound("https://assets.mixkit.co/active_storage/sfx/271/271-preview.mp3");
        resultText.innerHTML = `<span style="color:#B0FF2D; font-family:'Orbitron',sans-serif;">SUCCESS! [ ${name} ]</span><br><b style="color:#E8FF06; font-size:4rem; text-shadow: 0 0 20px #E8FF06;">${prize}</b>`;
        if (window.confetti) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#E8FF06', '#02F0FF'] });
    }
}

function renderAdminStockControl(){
  let div = document.getElementById("adminStock");
  if(!div) return;
  div.innerHTML = "";
  prizes.forEach((p, i) => {
    let row = document.createElement("div");
    row.className = "admin-stock-row";
    row.innerHTML = `
      <input type="text" value="${p.name}" onchange="updatePrize(${i}, 'name', this.value)" title="상품명">
      <input type="number" value="${p.weight}" onchange="updatePrize(${i}, 'weight', this.value)" title="가중치(확률)">
      <input type="number" value="${p.stock}" onchange="updatePrize(${i}, 'stock', this.value)" title="재고">
      <button class="cyber-btn" onclick="removePrize(${i})" style="width:40px; background:#FD23F6; color:white; padding:2px; border:none;">X</button>
    `;
    div.appendChild(row);
  });
}

function updatePrize(idx, field, val){
    prizes[idx][field] = (field === 'name') ? val : parseInt(val);
    db.ref("state/prizes").set(prizes);
}

function addNewPrize(){
    prizes.push({ name: "새 상품", weight: 1, stock: 1 });
    db.ref("state/prizes").set(prizes);
}

function removePrize(idx){
    if(!confirm("이 상품을 삭제할까요?")) return;
    prizes.splice(idx, 1);
    db.ref("state/prizes").set(prizes);
}

function resetSpecificSlot(num){
    if(!confirm(`${num}번 칸을 초기화하시겠습니까? (재고는 복구되지 않음)`)) return;
    delete used[num];
    db.ref("state/used").set(used);
}

function resetAll(){
  if(!confirm("판 전체와 로그를 리셋할까요?")) return;
  db.ref("state").set({ prizes: defaultPrizes, used: {} });
  db.ref("logs").remove();
}

function resetStock(){
  if(!confirm("모든 상품 수량을 초기 설정값(확률값)으로 채웁니다.")) return;
  prizes.forEach(p => p.stock = p.weight);
  db.ref("state/prizes").set(prizes);
}

function loadLogs(){
    db.ref("logs").on("value", snap => {
      let logs = snap.val() || {};
      let list = document.getElementById("logList");
      if(!list) return;
      list.innerHTML = "";
      Object.values(logs).reverse().slice(0, 30).forEach(l => {
        let li = document.createElement("li");
        let timeStr = l.time ? l.time : "시간 정보 없음";
        li.innerHTML = `<span style="color:#E8FF06;">[${timeStr}]</span> <span style="color:#FD23F6;">[${l.number}번]</span> <b>${l.name}</b> : ${l.prize}`;
        list.appendChild(li);
      });
    });
}

function updateStockUI(){
    let ul = document.getElementById("stock");
    if(!ul) return;
    ul.innerHTML = "";
    
    let totalWeight = prizes.reduce((a, b) => a + parseInt(b.weight), 0);

    prizes.forEach(p => {
      let prob = totalWeight > 0 ? ((p.weight / totalWeight) * 100).toFixed(1) : 0;
      let li = document.createElement("li");
      li.style.color = p.stock > 0 ? "#B0FF2D" : "#555";
      li.innerHTML = `<span>${p.name}</span> <span style="font-size:0.9em; font-family:'Orbitron',sans-serif;">${p.stock}개 (${prob}%)</span>`;
      ul.appendChild(li);
    });
}

function downloadCSV(){
    db.ref("logs").once("value", snap => {
      let logs = snap.val() || {};
      let csv = "\uFEFFname,number,prize,time\n";
      for(let k in logs){
        let l = logs[k];
        csv += `"${l.name}",${l.number},"${l.prize}","${l.time}"\n`;
      }
      let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      let a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "draw_logs.csv";
      a.click();
    });
}

function goAdmin(){ location.href = "admin.html"; }
function goMain(){ location.href = "index.html"; }