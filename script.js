const ACCESS_PASSWORD = "2026";
const ADMIN_PASSWORD = "0830";

const firebaseConfig = {
  apiKey: "AIzaSyDIeMvu1zQP6V4WNFkBeq3lPhKzSOo5EL8",
  authDomain: "commission-discount-draw.firebaseapp.com",
  databaseURL: "https://commission-discount-draw-default-rtdb.firebaseio.com",
  projectId: "commission-discount-draw",
  storageBucket: "commission-discount-draw.firebasestorage.app",
  messagingSenderId: "425410036868",
  appId: "1:425410036868:web:c3f999f5509cd73833eed1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let used = {};
let prizes = [];

// 🔥 실시간 동기화
db.ref("state").on("value", snap=>{
  let data = snap.val();
  if(!data) return;

  used = data.used || {};
  prizes = data.prizes || [];

  updateStock();
  renderBoard();
});

// 🎯 보드
function createBoard(){
  const board=document.getElementById("board");
  if(!board) return;

  board.innerHTML="";
  for(let i=1;i<=50;i++){
    let d=document.createElement("div");
    d.className="cell";
    d.innerText=i;

    if(used[i]) d.classList.add("used");

    d.onclick=()=>{
      if(used[i]) return;
      document.getElementById("number").value=i;
    };

    board.appendChild(d);
  }
}

function renderBoard(){ createBoard(); }

// 🎲 뽑기
function draw(){
  const name=document.getElementById("name").value.trim();
  let number=parseInt(document.getElementById("number").value);

  if(!name) return alert("닉네임 입력");

  if(!number){
    do{ number=Math.floor(Math.random()*50)+1; }
    while(used[number]);
  }

  if(used[number]) return alert("이미 선택됨");

  let available=prizes.filter(p=>p.stock>0);
  let total=available.reduce((a,b)=>a+b.weight,0);
  let rand=Math.random()*total;

  let selected;
  for(let p of available){
    rand-=p.weight;
    if(rand<=0){ selected=p; break; }
  }

  selected.stock--;
  used[number]=true;

  db.ref("state").set({prizes,used});
  db.ref("logs").push({
    name,number,prize:selected.name,time:new Date().toLocaleString()
  });

  showResult(name,selected.name);
}

// 🎉 결과
function showResult(name,prize){
  let r=document.getElementById("result");
  if(prize==="꽝"){
    r.innerText=`${name}님: 꽝! 다음 기회에!`;
  }else{
    r.innerText=`${name}님: ${prize} 당첨!`;
  }
}

// 📦 재고
function updateStock(){
  let ul=document.getElementById("stock");
  if(!ul) return;
  ul.innerHTML="";
  prizes.forEach(p=>{
    let li=document.createElement("li");
    li.innerText=`${p.name}: ${p.stock}`;
    ul.appendChild(li);
  });
}

// 🔐 관리자
function login(){
  let pw=document.getElementById("pw").value;
  if(pw!==ADMIN_PASSWORD) return alert("비번 틀림");

  document.getElementById("adminPanel").style.display="block";
  loadAdminStock();
  loadLogs();
}

// 🛠 관리자 수량 수정
function loadAdminStock(){
  let div=document.getElementById("adminStock");
  div.innerHTML="";

  prizes.forEach((p,i)=>{
    let input=document.createElement("input");
    input.value=p.stock;

    input.onchange=()=>{
      prizes[i].stock=parseInt(input.value);
      db.ref("state").set({prizes,used});
    };

    div.append(`${p.name} `);
    div.appendChild(input);
    div.appendChild(document.createElement("br"));
  });
}

// 📊 로그
function loadLogs(){
  db.ref("logs").on("value",snap=>{
    let logs=snap.val()||{};
    let list=document.getElementById("logList");
    list.innerHTML="";
    for(let k in logs){
      let l=logs[k];
      let li=document.createElement("li");
      li.innerText=`${l.name}/${l.number}/${l.prize}/${l.time}`;
      list.appendChild(li);
    }
  });
}

// 🔄 초기화
function resetAll(){
  if(!confirm("전체 초기화?")) return;

  used={};
  prizes.forEach(p=>p.stock=p.weight);

  db.ref("state").set({prizes,used});
  db.ref("logs").remove();
}

function resetStock(){
  prizes.forEach(p=>p.stock=p.weight);
  db.ref("state").set({prizes,used});
}

// CSV
function downloadCSV(){
  db.ref("logs").once("value",snap=>{
    let logs=snap.val()||{};
    let csv="name,number,prize,time\n";

    for(let k in logs){
      let l=logs[k];
      csv+=`${l.name},${l.number},${l.prize},${l.time}\n`;
    }

    let blob=new Blob([csv]);
    let a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="log.csv";
    a.click();
  });
}

// 이동
function goAdmin(){location.href="admin.html";}
function goMain(){location.href="index.html";}

// 시작
createBoard();