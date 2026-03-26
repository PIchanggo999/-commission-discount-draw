// ----------------------------
// Firebase 설정
// ----------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDIeMvu1zQP6V4WNFkBeq3lPhKzSOo5EL8",
  authDomain: "commission-discount-draw.firebaseapp.com",
  databaseURL: "https://commission-discount-draw-default-rtdb.firebaseio.com",
  projectId: "commission-discount-draw",
  storageBucket: "commission-discount-draw.firebasestorage.app",
  messagingSenderId: "425410036868",
  appId: "1:425410036868:web:c3f999f5509cd73833eed1",
  measurementId: "G-4SZ4ZFSH8P"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ----------------------------
// 뽑기판 초기화
// ----------------------------
const rows = 10, cols = 5;
const board = document.getElementById("board");
const resultsList = document.getElementById("results");
const cells = [];

for(let r=0;r<rows;r++){
  const tr = document.createElement("tr");
  const row = [];
  for(let c=0;c<cols;c++){
    const td = document.createElement("td");
    td.textContent = r*cols+c+1;
    td.addEventListener("click", ()=> selectCell(r,c));
    tr.appendChild(td);
    row.push(td);
  }
  board.appendChild(tr);
  cells.push(row);
}

// ----------------------------
// 셀 선택 함수
// ----------------------------
async function selectCell(r,c){
  const nickname = document.getElementById("nickname").value.trim();
  if(!nickname){ alert("닉네임을 입력하세요!"); return; }

  const cellRef = db.ref(`board/${r}/${c}`);
  const snapshot = await cellRef.get();
  if(snapshot.exists()){ alert("이미 선택된 칸입니다!"); return; }

  // 상품 불러오기
  const prizeSnapshot = await db.ref("prizes").get();
  if(!prizeSnapshot.exists()){ alert("상품 정보가 없습니다."); return; }
  const prizes = Object.values(prizeSnapshot.val()).filter(p => p.stock > 0);

  if(prizes.length === 0){ alert("모든 상품이 소진되었습니다."); return; }

  // 확률 기반 선택
  let totalWeight = prizes.reduce((sum,p)=>sum+p.probability,0);
  let rand = Math.random() * totalWeight;
  let selected;
  for(let p of prizes){
    rand -= p.probability;
    if(rand <= 0){
      selected = p;
      break;
    }
  }

  // 재고 감소
  const prizeIndex = prizes.indexOf(selected);
  db.ref(`prizes/${prizeIndex}/stock`).set(selected.stock - 1);

  // 선택 기록 저장
  cellRef.set({nickname: nickname, prize: selected.name, timestamp: Date.now()});
}

// ----------------------------
// 결과 추가 함수
// ----------------------------
function addResult(name, number, prize){
  const li = document.createElement("li");
  li.textContent = `${name}님 → ${number}번: ${prize}`;
  resultsList.appendChild(li);
}

// ----------------------------
// 실시간 동기화
// ----------------------------
db.ref("board").on("value", snapshot=>{
  const data = snapshot.val() || {};
  resultsList.innerHTML = "";
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const td = cells[r][c];
      if(data[r] && data[r][c]){
        td.textContent = "★";
        td.className = "selected";
        const prize = data[r][c].prize;
        if(prize.includes("15000")) td.classList.add("prize1");
        else if(prize.includes("5000")) td.classList.add("prize2");
        else td.classList.add("prize0");
        addResult(data[r][c].nickname, r*cols+c+1, prize);
      } else {
        td.textContent = r*cols+c+1;
        td.className = "";
      }
    }
  }
});