// 🔐 접속 비밀번호
const SITE_PASSWORD = "2026";

// 🔐 관리자 비밀번호
const ADMIN_PASSWORD = "0830";

// 👉 접속 차단
if (!sessionStorage.getItem("auth")) {
  const input = prompt("비밀번호 입력");
  if (input === SITE_PASSWORD) {
    sessionStorage.setItem("auth", "ok");
  } else {
    document.body.innerHTML = "접근 불가";
  }
}

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


// 🎁 상품 초기화
function initPrizes() {
  const data = [
    { name: "★15000원 할인★", weight: 1, stock: 1 },
    { name: "5000원 할인", weight: 4, stock: 4 },
    { name: "3000원 할인", weight: 10, stock: 10 },
    { name: "1000원 할인", weight: 15, stock: 15 },
    { name: "꽝", weight: 20, stock: 20 }
  ];
  db.ref("game/prizes").set(data);
}

// 🎯 보드 생성
function createBoard() {
  const board = document.getElementById("board");
  if (!board) return;

  board.innerHTML = "";

  for (let i = 1; i <= 50; i++) {
    let div = document.createElement("div");
    div.className = "cell";
    div.innerText = i;
    div.onclick = () => document.getElementById("number").value = i;
    board.appendChild(div);
  }
}

// 🎲 뽑기
function draw() {
  const name = document.getElementById("name").value.trim();
  const number = parseInt(document.getElementById("number").value);

  if (!name) return alert("닉네임 입력");
  if (!number) return alert("번호 입력");

  const boardRef = db.ref("game/board/" + number);
  const prizesRef = db.ref("game/prizes");

  boardRef.once("value", snap => {
    if (snap.exists()) {
      alert("이미 선택된 번호");
      return;
    }

    prizesRef.once("value", psnap => {
      let prizes = psnap.val();

      let available = prizes.filter(p => p.stock > 0);
      let total = available.reduce((a,b)=>a+b.weight,0);
      let rand = Math.random()*total;

      let selected;
      for (let p of available) {
        rand -= p.weight;
        if (rand <= 0) {
          selected = p;
          break;
        }
      }

      // 재고 감소
      let index = prizes.findIndex(p => p.name === selected.name);
      prizes[index].stock--;

      prizesRef.set(prizes);

      // 보드 기록
      boardRef.set({
        prize: selected.name,
        name: name
      });

      db.ref("game/logs").push({
        name, number, prize: selected.name
      });

      document.getElementById("result").innerText =
        `${name} → ${selected.name}`;

      // 🎉 효과
      if (selected.name !== "꽝") {
        confetti();
        document.getElementById("winSound").play();
      } else {
        document.getElementById("loseSound").play();
      }

      document.getElementById("name").value = "";
      document.getElementById("number").value = "";
    });
  });
}

// 🔥 실시간 보드
db.ref("game/board").on("value", snap => {
  const data = snap.val() || {};

  document.querySelectorAll(".cell").forEach(c => {
    let num = parseInt(c.innerText);

    if (data[num]) {
      c.classList.add("used");
      c.innerText = data[num].prize;
    }
  });
});

// 🔥 실시간 재고
db.ref("game/prizes").on("value", snap => {
  const list = document.getElementById("stock");
  if (!list) return;

  const prizes = snap.val() || [];

  list.innerHTML = "";
  prizes.forEach(p => {
    let li = document.createElement("li");
    li.innerText = `${p.name}: ${p.stock}`;
    list.appendChild(li);
  });
});

// 🔐 관리자 로그인
function login() {
  if (document.getElementById("pw").value === ADMIN_PASSWORD) {
    document.getElementById("adminPanel").style.display = "block";
  } else {
    alert("비번 틀림");
  }
}

// 🔄 초기화
function resetGame() {
  if (!confirm("초기화?")) return;
  db.ref("game").remove();
}

// 시작
createBoard();