
(function(){
  function $(s){return document.querySelector(s);}

  // v25에서 PTP 관련 초기화 코드가 다른 함수 안으로 들어가 버린 문제를
  // 별도 전역 로직으로 복구한다.
  window.inputMode = window.inputMode || 'loose';

  window.applyInputMode = function(){
    const loose = window.inputMode !== 'ptp';
    const looseBtn=$('#modeLoose'), ptpBtn=$('#modePTP');
    if(looseBtn) looseBtn.className=loose?'primary':'secondary';
    if(ptpBtn) ptpBtn.className=!loose?'primary':'secondary';

    const photo=$('#loosePhotoSection');
    const shots=$('#shotHistoryCard');
    const help=$('#ptpHelp');
    if(photo) photo.style.display=loose?'':'none';
    if(shots) shots.style.display=loose?'':'none';
    if(help) help.classList.toggle('hidden',loose);

    const qtyLabel=$('#qtyLabel');
    if(qtyLabel) qtyLabel.textContent=loose?'필렌즈에서 센 수량(T)':'PTP 수량(T)';

    const addBtn=$('#addItem');
    if(addBtn) addBtn.textContent=loose?'이 약 추가 완료':'PTP 약 추가 완료';

    if(!loose){
      try{ window.currentPhotoData=''; }catch(e){}
      try{ window.countShots=[]; }catch(e){}
      try{ window.countParts=[]; }catch(e){}
      const preview=$('#pillEyePreview');
      if(preview){preview.src='';preview.style.display='none';}
      const status=$('#shareStatus');
      if(status) status.textContent='';
    }
  };

  function setMode(mode){
    window.inputMode=mode;
    window.applyInputMode();
  }

  function wire(){
    const loose=$('#modeLoose'), ptp=$('#modePTP');
    if(loose) loose.onclick=function(e){e.preventDefault();setMode('loose');};
    if(ptp) ptp.onclick=function(e){e.preventDefault();setMode('ptp');};

    // 기존 addItem 함수가 inputMode 전역을 보도록 보장
    setMode(window.inputMode||'loose');
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',wire,{once:true});
  }else{
    wire();
  }
})();
