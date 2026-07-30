(function(){
  "use strict";

  /* ============ CONFIG ============ */
  const TARGET_SCORE = 150;
  const START_TIME = 75;
  const MAX_LIVES = 3;
  const TRAY_SLOTS = 6;
  const SPAWN_INTERVAL = 1350;
  const NUM_CUSTOMERS = 5;
  const LEADERBOARD_KEY = 'nightMarketLeaderboard';
  const NAME_KEY = 'nightMarketPlayerName';

  const FOOD_TYPES = [
    {id:'ramen', emoji:'🍜'},
    {id:'sushi', emoji:'🍣'},
    {id:'dumpling', emoji:'🥟'},
    {id:'skewer', emoji:'🍢'},
    {id:'taiyaki', emoji:'🐟'},
    {id:'bun', emoji:'🥠'},
    {id:'rice', emoji:'🍙'},
    {id:'noodle', emoji:'🍝'},
  ];
  const CUSTOMER_FACES = ['😺','🐼','🐰','🦊','🐸','🐻'];
  const CUSTOMER_NAMES = ['Momo','Kiko','Taro','Hana','Bao','Yuki'];

  /* ============ AUDIO ============ */
  let actx = null;
  let soundOn = true;
  let bgmNodes = null;

  function ensureAudio(){
    if(!actx){
      actx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(actx.state === 'suspended') actx.resume();
  }

  function playTone(freq, dur, type, startTime, gainVal){
    if(!soundOn || !actx) return;

    const osc = actx.createOscillator();
    const gain = actx.createGain();

    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainVal || 0.18, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
    
    osc.connect(gain).connect(actx.destination);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.05);
  }

  function playSuccess(){
    if(!soundOn || !actx) return;

    const t = actx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((f,i)=> playTone(f, 0.22, 'triangle', t + i*0.075, 0.15));
  }

  function playFail(){
    if(!soundOn || !actx) return;

    const t = actx.currentTime;
    const notes = [300, 240, 180];

    notes.forEach((f,i)=> playTone(f, 0.28, 'sawtooth', t + i*0.09, 0.14));
  }

  function playGameOver(){
    if(!soundOn || !actx) return;

    const t = actx.currentTime;

    [392,349,293,220].forEach((f,i)=> playTone(f, 0.4, 'sawtooth', t + i*0.18, 0.16));
  }

  function playVictory(){
    if(!soundOn || !actx) return;

    const t = actx.currentTime;

    [523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=> playTone(f, 0.3, 'triangle', t + i*0.11, 0.17));
  }

  function playPickup(){
    if(!soundOn || !actx) return;

    playTone(700, 0.08, 'square', actx.currentTime, 0.06);
  }

  // Suspenseful looping background pulse using scheduled oscillators
  let bgmTimer = null;

  function startBGM(){
    if(!soundOn) return;

    ensureAudio();
    stopBGM();

    const bassFreqs = [110, 116.5, 110, 98];
    let step = 0;


    function scheduleStep(){
      if(!soundOn){ bgmTimer = setTimeout(scheduleStep, 500); return; }

      const t = actx.currentTime;
      const f = bassFreqs[step % bassFreqs.length];
      const osc = actx.createOscillator();
      const gain = actx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

      osc.connect(gain).connect(actx.destination);
      osc.start(t); osc.stop(t + 0.6);

      // ticking hi-hat-like accent for tension
      const hi = actx.createOscillator();
      const hiGain = actx.createGain();

      hi.type = 'square';
      hi.frequency.setValueAtTime(1800, t + 0.3);

      hiGain.gain.setValueAtTime(0.0001, t+0.3);
      hiGain.gain.linearRampToValueAtTime(0.015, t+0.31);
      hiGain.gain.exponentialRampToValueAtTime(0.0001, t+0.38);

      hi.connect(hiGain).connect(actx.destination);
      hi.start(t+0.3); hi.stop(t+0.4);

      step++;
      bgmTimer = setTimeout(scheduleStep, 550);
    }

    scheduleStep();
  }


  function stopBGM(){
    if(bgmTimer){ clearTimeout(bgmTimer); bgmTimer = null; }
  }

  /* ============ STATE ============ */
  let score = 0;
  let lives = MAX_LIVES;
  let timeLeft = START_TIME;
  let combo = 0;
  let running = false;
  let isPaused = false;
  let scoreSaved = false;
  let spawnInterval = null;
  let tickInterval = null;
  let customers = [];
  let playerName = 'Player';

  /* ============ DOM REFS ============ */
  const heartsEl = document.getElementById('hearts');
  const scoreValueEl = document.getElementById('score-value');
  const timerNumEl = document.getElementById('timer-num');
  const ringFg = document.getElementById('ringFg');
  const timerWrap = document.getElementById('timer-wrap');
  const comboBadge = document.getElementById('combo-badge');
  const customersEl = document.getElementById('customers');
  const trayEl = document.getElementById('tray');
  const dragGhost = document.getElementById('drag-ghost');
  const stage = document.getElementById('stage');
  const lanternRow = document.getElementById('lanternRow');
  const starsEl = document.getElementById('stars');


  const startScreen = document.getElementById('startScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const victoryScreen = document.getElementById('victoryScreen');
  const soundToggle = document.getElementById('sound-toggle');
  const pauseToggle = document.getElementById('pause-toggle');
  const pausedScreen = document.getElementById('pausedScreen');
  const leaderboardScreen = document.getElementById('leaderboardScreen');
  const leaderboardListEl = document.getElementById('leaderboardList');
  const playerNameInput = document.getElementById('playerNameInput');

  const RING_CIRC = 2 * Math.PI * 24;
  ringFg.style.strokeDasharray = RING_CIRC;

  /* ============ SETUP DECOR ============ */
  function buildStars(){
    starsEl.innerHTML = '';

    for(let i=0;i<28;i++){
      const s = document.createElement('div');

      s.className = 'star';
      s.style.left = Math.random()*100 + '%';
      s.style.top = Math.random()*45 + '%';
      s.style.animationDelay = (Math.random()*3) + 's';
      starsEl.appendChild(s);
    }
  }

  function buildLanterns(){
    lanternRow.innerHTML = '';

    for(let i=0;i<7;i++){
      const l = document.createElement('div');

      l.className = 'lantern';
      l.style.animationDelay = (i*0.15) + 's, ' + (i*0.1) + 's';
      lanternRow.appendChild(l);
    }
  }

  function buildSteam(){
    const positions = [18, 50, 82];
    positions.forEach((p,i)=>{
      const s = document.createElement('div');
      s.className = 'steam';
      s.style.left = p + '%';
      s.style.animationDelay = (i*1.3) + 's';
      stage.querySelector('.stall-back').appendChild(s);
    });
  }


  /* ============ HEARTS ============ */
  const HEART_SVG = `<svg viewBox="0 0 32 29"><path d="M16 28.5C16 28.5 1.5 19.6 1.5 9.8C1.5 4.9 5.4 1 10.2 1C13 1 15.3 2.4 16 4.4C16.7 2.4 19 1 21.8 1C26.6 1 30.5 4.9 30.5 9.8C30.5 19.6 16 28.5 16 28.5Z" fill="#ff5d8f" stroke="#c23663" stroke-width="1.5"/></svg>`;
  
  function buildHearts(){
    heartsEl.innerHTML = '';
    
    for(let i=0;i<MAX_LIVES;i++){
      const h = document.createElement('div');
      h.className = 'heart';
      h.innerHTML = HEART_SVG;
      heartsEl.appendChild(h);
    }
  }
  function updateHearts(prevLives){
    const nodes = heartsEl.querySelectorAll('.heart');
    nodes.forEach((n, idx)=>{
      if(idx >= lives && idx < (prevLives===undefined?MAX_LIVES:prevLives)){
        n.classList.add('lost');
      } else if(idx >= lives){
        n.style.visibility = 'hidden';
      }
    });
  }

  /* ============ CUSTOMERS ============ */
  function createCustomers(){
    customersEl.innerHTML = '';
    customers = [];
    const count = NUM_CUSTOMERS;
    for(let i=0;i<count;i++){
      const wrap = document.createElement('div');
      wrap.className = 'customer';

      const face = document.createElement('div');
      face.className = 'customer-face';
      const faceEmoji = CUSTOMER_FACES[i % CUSTOMER_FACES.length];
      face.textContent = faceEmoji;

      const plate = document.createElement('div');
      plate.className = 'plate-zone';
      const wantSpan = document.createElement('div');
      wantSpan.className = 'want-emoji';
      plate.appendChild(wantSpan);

      const tag = document.createElement('div');
      tag.className = 'name-tag';
      tag.textContent = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length];

      wrap.appendChild(face);
      wrap.appendChild(plate);
      wrap.appendChild(tag);
      customersEl.appendChild(wrap);

      const cust = { el: wrap, face, plate, wantSpan, wantId: null };
      customers.push(cust);
      assignNewWant(cust);
    }
  }

  function randomFood(excludeId){
    let pool = FOOD_TYPES;
    if(excludeId){
      pool = FOOD_TYPES.filter(f=>f.id !== excludeId);
    }
    return pool[Math.floor(Math.random()*pool.length)];
  }

  function assignNewWant(cust){
    const currentWants = customers.filter(c=>c!==cust).map(c=>c.wantId);
    let food = randomFood(cust.wantId);
    // try to reduce duplicate wants across customers for variety
    let attempts = 0;
    while(currentWants.includes(food.id) && attempts < 5){
      food = randomFood(cust.wantId);
      attempts++;
    }
    cust.wantId = food.id;
    cust.wantSpan.textContent = food.emoji;
  }

  /* ============ TRAY / FOOD SPAWNING ============ */
  function spawnFood(){
    if(!running || isPaused) return;
    if(trayEl.children.length >= TRAY_SLOTS) return;

    // Bias: ~55% chance to spawn something a customer currently wants
    let food;
    if(Math.random() < 0.55 && customers.length){
      const target = customers[Math.floor(Math.random()*customers.length)];
      food = FOOD_TYPES.find(f=>f.id === target.wantId);
    } else {
      food = randomFood();
    }

    const item = document.createElement('div');
    item.className = 'food-item';
    item.dataset.foodId = food.id;
    const bowl = document.createElement('div');
    bowl.className = 'food-bowl';
    bowl.textContent = food.emoji;
    item.appendChild(bowl);
    trayEl.appendChild(item);

    attachDragHandlers(item, food);
  }

  /* ============ DRAG & DROP (Pointer Events) ============ */
  let dragState = null;

  function attachDragHandlers(item, food){
    item.addEventListener('pointerdown', (e)=>{
      if(!running || isPaused) return;
      e.preventDefault();
      ensureAudio();
      playPickup();
      const rect = item.getBoundingClientRect();
      dragState = {
        item, food,
        offsetX: 0, offsetY: 0,
      };
      item.classList.add('dragging');
      dragGhost.style.display = 'flex';
      dragGhost.textContent = '';
      const g = document.createElement('div');
      g.className = 'food-bowl';
      g.style.width = '74px'; g.style.height='74px'; g.style.fontSize='40px';
      g.textContent = food.emoji;
      dragGhost.innerHTML = '';
      dragGhost.appendChild(g);
      moveGhost(e.clientX, e.clientY);
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });
  }

  function moveGhost(x,y){
    dragGhost.style.left = x + 'px';
    dragGhost.style.top = y + 'px';
  }

  function clearHoverStates(){
    customers.forEach(c=> c.plate.classList.remove('hover-good','hover-bad'));
  }

  function onPointerMove(e){
    if(!dragState) return;
    moveGhost(e.clientX, e.clientY);
    clearHoverStates();
    const target = findCustomerAt(e.clientX, e.clientY);
    if(target){
      if(target.wantId === dragState.food.id){
        target.plate.classList.add('hover-good');
      } else {
        target.plate.classList.add('hover-bad');
      }
    }
  }

  function findCustomerAt(x,y){
    for(const c of customers){
      const r = c.plate.getBoundingClientRect();
      const pad = 14;
      if(x >= r.left-pad && x <= r.right+pad && y >= r.top-pad && y <= r.bottom+pad){
        return c;
      }
    }
    return null;
  }

  function isOverTray(x,y){
    const r = trayEl.getBoundingClientRect();
    return x>=r.left && x<=r.right && y>=r.top-10 && y<=r.bottom+30;
  }

  function onPointerUp(e){
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    if(!dragState) return;
    const {item, food} = dragState;
    clearHoverStates();
    dragGhost.style.display = 'none';

    if(isOverTray(e.clientX, e.clientY)){
      // cancelled drag, return safely
      item.classList.remove('dragging');
      dragState = null;
      return;
    }

    const target = findCustomerAt(e.clientX, e.clientY);
    item.remove();

    if(!running){ dragState = null; return; }

    if(target && target.wantId === food.id){
      handleSuccess(target, e.clientX, e.clientY);
    } else if(target){
      handleWrongFood(target, e.clientX, e.clientY);
    } else {
      handleMiss(e.clientX, e.clientY);
    }
    dragState = null;
  }

  /* touch fallback isn't needed separately since pointer events cover touch */

  function handleSuccess(cust, x, y){
    combo++;
    const bonus = Math.min(30, 10 + (combo-1)*4);
    score += bonus;
    updateScore();
    showFloater(x, y, '+' + bonus, false);
    burstParticles(x, y, ['#3ddc97','#ffd873','#fff']);
    cust.face.classList.remove('happy'); void cust.face.offsetWidth; cust.face.classList.add('happy');
    playSuccess();
    lightLanterns();
    if(combo >= 2){
      comboBadge.textContent = 'Combo x' + combo + '!';
      comboBadge.classList.add('show');
      clearTimeout(comboBadge._t);
      comboBadge._t = setTimeout(()=> comboBadge.classList.remove('show'), 1200);
    }
    assignNewWant(cust);
    checkVictory();
  }

  function handleWrongFood(cust, x, y){
    combo = 0;
    showFloater(x, y, 'Oops!', true);
    cust.face.classList.remove('sad'); void cust.face.offsetWidth; cust.face.classList.add('sad');
    playFail();
    loseLife();
  }

  function handleMiss(x, y){
    combo = 0;
    showFloater(x, y, 'Missed!', true);
    playFail();
    loseLife();
  }

  function lightLanterns(){
    const lit = Math.min(7, Math.floor(score / (TARGET_SCORE/7)) + 1);
    const nodes = lanternRow.querySelectorAll('.lantern');
    nodes.forEach((n,i)=> n.classList.toggle('lit', i < lit));
  }

  function loseLife(){
    const prev = lives;
    lives = Math.max(0, lives - 1);
    updateHearts(prev);
    stage.style.animation = 'none';
    requestAnimationFrame(()=>{ stage.style.animation = ''; });
    if(lives <= 0){
      endGame(false, 'lives');
    }
  }

  function updateScore(){
    scoreValueEl.textContent = score;
    scoreValueEl.classList.remove('bump');
    void scoreValueEl.offsetWidth;
    scoreValueEl.classList.add('bump');
  }

  function showFloater(x,y,text,bad){
    const f = document.createElement('div');
    f.className = 'floater' + (bad ? ' bad' : '');
    f.textContent = text;
    const stageRect = stage.getBoundingClientRect();
    f.style.left = (x - stageRect.left - 20) + 'px';
    f.style.top = (y - stageRect.top - 20) + 'px';
    stage.appendChild(f);
    setTimeout(()=> f.remove(), 1000);
  }

  function burstParticles(x,y,colors){
    const stageRect = stage.getBoundingClientRect();
    for(let i=0;i<10;i++){
      const p = document.createElement('div');
      p.className = 'burst';
      p.style.left = (x - stageRect.left) + 'px';
      p.style.top = (y - stageRect.top) + 'px';
      p.style.background = colors[i % colors.length];
      const angle = (Math.PI*2/10)*i;
      const dist = 40 + Math.random()*30;
      const dx = Math.cos(angle)*dist;
      const dy = Math.sin(angle)*dist;
      stage.appendChild(p);
      p.animate([
        { transform:'translate(0,0) scale(1)', opacity:1 },
        { transform:`translate(${dx}px, ${dy}px) scale(0.2)`, opacity:0 }
      ], {duration:600, easing:'ease-out'});
      setTimeout(()=> p.remove(), 620);
    }
  }

  /* ============ TIMER ============ */
  function updateTimerUI(){
    timerNumEl.textContent = timeLeft;
    const frac = Math.max(0, timeLeft / START_TIME);
    ringFg.style.strokeDashoffset = RING_CIRC * (1 - frac);
    if(timeLeft <= 15){
      timerWrap.classList.add('urgent');
    } else {
      timerWrap.classList.remove('urgent');
    }
  }

  function tick(){
    if(!running || isPaused) return;
    timeLeft--;
    updateTimerUI();
    if(timeLeft <= 0){
      endGame(false, 'time');
    }
  }

  /* ============ VICTORY / GAME OVER ============ */
  function checkVictory(){
    if(score >= TARGET_SCORE){
      endGame(true);
    }
  }

  function endGame(won, reason){
    if(!running) return;
    running = false;
    isPaused = false;
    clearInterval(spawnInterval);
    clearInterval(tickInterval);
    stopBGM();
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);

    let rankInfo = null;
    if(!scoreSaved){
      rankInfo = addScoreToLeaderboard(playerName, score);
      scoreSaved = true;
    }

    if(won){
      document.getElementById('victoryScore').textContent = score;
      document.getElementById('victoryTime').textContent = timeLeft + 's';
      const note = document.getElementById('victoryRankNote');
      note.textContent = rankInfo && rankInfo.rank > -1 ? `You're #${rankInfo.rank+1} on the leaderboard, ${playerName}!` : '';
      victoryScreen.classList.remove('hidden');
      playVictory();
    } else {
      const title = document.getElementById('gameOverTitle');
      const msg = document.getElementById('gameOverMsg');
      if(reason === 'time'){
        title.textContent = "Time's Up!";
        msg.textContent = "The market is closing... so close! Try again?";
      } else {
        title.textContent = 'Game Over';
        msg.textContent = 'The stall has run out of patience tonight...';
      }
      document.getElementById('finalScore').textContent = score;
      const note = document.getElementById('gameOverRankNote');
      note.textContent = rankInfo && rankInfo.rank > -1 ? `You're #${rankInfo.rank+1} on the leaderboard, ${playerName}!` : '';
      gameOverScreen.classList.remove('hidden');
      playGameOver();
    }
  }

  /* ============ LEADERBOARD ============ */
  function loadLeaderboard(){
    try{
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch(e){
      return [];
    }
  }

  function saveLeaderboard(list){
    try{ localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(list)); }catch(e){ /* storage unavailable */ }
  }

  function addScoreToLeaderboard(name, finalScore){
    const list = loadLeaderboard();
    const entry = { name: (name || 'Player').slice(0,16), score: finalScore, date: Date.now() };
    list.push(entry);
    list.sort((a,b)=> b.score - a.score);
    const trimmed = list.slice(0, 10);
    saveLeaderboard(trimmed);
    return { list: trimmed, rank: trimmed.findIndex(e=> e===entry) };
  }

  function renderLeaderboard(highlightEntryIndex){
    const list = loadLeaderboard();
    leaderboardListEl.innerHTML = '';
    if(list.length === 0){
      const div = document.createElement('div');
      div.className = 'empty-msg';
      div.textContent = 'No scores yet — be the first chef on the board!';
      leaderboardListEl.appendChild(div);
      return;
    }
    list.forEach((entry, idx)=>{
      const li = document.createElement('li');
      if(idx === highlightEntryIndex) li.classList.add('me');
      const medal = idx===0 ? '🥇' : idx===1 ? '🥈' : idx===2 ? '🥉' : (idx+1)+'.';
      li.innerHTML = `<span class="rank">${medal}</span><span class="lb-name"></span><span class="lb-score"></span>`;
      li.querySelector('.lb-name').textContent = entry.name;
      li.querySelector('.lb-score').textContent = entry.score;
      leaderboardListEl.appendChild(li);
    });
  }

  function getEnteredName(){
    const v = (playerNameInput.value || '').trim();
    return v.length ? v.slice(0,16) : 'Player';
  }

  /* ============ PAUSE ============ */
  function pauseGame(){
    if(!running || isPaused) return;
    isPaused = true;
    clearInterval(spawnInterval);
    clearInterval(tickInterval);
    stopBGM();
    // cancel any active drag so nothing is left stuck mid-air
    if(dragState){
      dragState.item.classList.remove('dragging');
      dragState.item.remove();
      dragState = null;
      dragGhost.style.display = 'none';
      clearHoverStates();
    }
    pausedScreen.classList.remove('hidden');
    pauseToggle.textContent = '▶️';
  }

  function resumeGame(){
    if(!running || !isPaused) return;
    isPaused = false;
    pausedScreen.classList.add('hidden');
    pauseToggle.textContent = '⏸';
    spawnInterval = setInterval(spawnFood, SPAWN_INTERVAL);
    tickInterval = setInterval(tick, 1000);
    startBGM();
  }

  function fullReturnToMenu(){
    running = false;
    isPaused = false;
    clearInterval(spawnInterval);
    clearInterval(tickInterval);
    stopBGM();
    if(dragState){
      dragState.item.remove();
      dragState = null;
      dragGhost.style.display = 'none';
    }
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    pausedScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    leaderboardScreen.classList.add('hidden');
    pauseToggle.textContent = '⏸';
    trayEl.innerHTML = '';
    playerNameInput.value = '';
    startScreen.classList.remove('hidden');
  }

  /* ============ GAME LIFECYCLE ============ */
  function resetState(){
    score = 0; lives = MAX_LIVES; timeLeft = START_TIME; combo = 0;
    isPaused = false; scoreSaved = false;
    pauseToggle.textContent = '⏸';
    pausedScreen.classList.add('hidden');
    scoreValueEl.textContent = '0';
    buildHearts();
    for(let i=0;i<MAX_LIVES;i++){} // no-op, hearts already visible
    trayEl.innerHTML = '';
    createCustomers();
    updateTimerUI();
    lanternRow.querySelectorAll('.lantern').forEach(n=> n.classList.remove('lit'));
    comboBadge.classList.remove('show');
  }

  function startGame(){
    ensureAudio();
    playerName = getEnteredName();
    try{ localStorage.setItem(NAME_KEY, playerName); }catch(e){}
    resetState();
    running = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    spawnFood(); spawnFood(); spawnFood();
    spawnInterval = setInterval(spawnFood, SPAWN_INTERVAL);
    tickInterval = setInterval(tick, 1000);
    startBGM();
  }

  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('restartBtn').addEventListener('click', startGame);
  document.getElementById('playAgainBtn').addEventListener('click', startGame);
  document.getElementById('restartFromPauseBtn').addEventListener('click', startGame);

  soundToggle.addEventListener('click', ()=>{
    soundOn = !soundOn;
    soundToggle.textContent = soundOn ? '🔊' : '🔇';
    if(soundOn){ ensureAudio(); if(running && !isPaused) startBGM(); }
    else { stopBGM(); }
  });

  pauseToggle.addEventListener('click', ()=>{
    if(!running) return;
    if(isPaused) resumeGame(); else pauseGame();
  });
  document.getElementById('resumeBtn').addEventListener('click', resumeGame);
  document.getElementById('mainMenuBtn').addEventListener('click', fullReturnToMenu);

  document.getElementById('showLeaderboardBtn').addEventListener('click', ()=>{
    renderLeaderboard(-1);
    leaderboardScreen.classList.remove('hidden');
  });
  document.getElementById('closeLeaderboardBtn').addEventListener('click', ()=>{
    leaderboardScreen.classList.add('hidden');
  });
  document.getElementById('clearLeaderboardBtn').addEventListener('click', ()=>{
    if(confirm('Reset the leaderboard for everybody? This cannot be undone.')){
      saveLeaderboard([]);
      renderLeaderboard(-1);
    }
  });
  document.getElementById('gameOverLeaderboardBtn').addEventListener('click', ()=>{
    renderLeaderboard(-1);
    leaderboardScreen.classList.remove('hidden');
  });
  document.getElementById('victoryLeaderboardBtn').addEventListener('click', ()=>{
    renderLeaderboard(-1);
    leaderboardScreen.classList.remove('hidden');
  });

  playerNameInput.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter') startGame();
  });

  /* ============ INIT ============ */
  buildStars();
  buildLanterns();
  buildSteam();
  buildHearts();
  try{
    const savedName = localStorage.getItem(NAME_KEY);
    if(savedName) playerNameInput.value = savedName;
  }catch(e){}

})();