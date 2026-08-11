
(function(){
  const $=s=>document.querySelector(s);
  const wonLocal=v=>(Number(v)||0).toLocaleString('ko-KR',{maximumFractionDigits:2})+'원';

  let ptpMode=false;

  function ensurePanel(){
    if($('#ptpEntryPanel'))return;
    const modeCard=$('#inputModeCard');
    if(!modeCard)return;

    const panel=document.createElement('section');
    panel.id='ptpEntryPanel';
    panel.className='card hidden';
    panel.innerHTML=`
      <h2>PTP 약 입력</h2>
      <div style="display:grid;gap:12px">
        <div>
          <label>약 이름</label>
          <input id="ptpDrugName" list="drugMaster" autocomplete="off" placeholder="예: 씨잘정 5mg">
        </div>
        <div>
          <label>수량(T)</label>
          <input id="ptpQty" type="number" min="0" step="1" inputmode="numeric" placeholder="예: 155">
        </div>
        <div>
          <label>1T당 반품금액(원)</label>
          <input id="ptpUnitPrice" type="number" min="0" step="0.01" inputmode="decimal" placeholder="예: 23">
        </div>
      </div>
      <div class="totalBox" style="margin-top:14px">
        <div class="note">PTP 반품금액</div>
        <b id="ptpTotal">0원</b>
        <div class="note" id="ptpFormula"></div>
      </div>
      <button type="button" class="primary" id="ptpAddItem" style="width:100%;margin-top:12px">PTP 약 추가 완료</button>
    `;
    modeCard.insertAdjacentElement('afterend',panel);

    const name=$('#ptpDrugName'), qty=$('#ptpQty'), price=$('#ptpUnitPrice');

    function syncAndCalc(){
      const drug=(name.value||'').trim();
      const q=Math.max(0,Number(qty.value)||0);
      const p=Math.max(0,Number(price.value)||0);

      // 기존 데이터 필드에도 동기화해서 검색/기존 약가 기능과 호환
      if($('#drugName'))$('#drugName').value=drug;
      if($('#qty'))$('#qty').value=q||'';
      if($('#unitPrice'))$('#unitPrice').value=p||'';

      $('#ptpTotal').textContent=wonLocal(q*p);
      $('#ptpFormula').textContent=q&&p?`${q}T × ${p.toLocaleString('ko-KR')}원 = ${wonLocal(q*p)}`:'';
    }

    name.addEventListener('input',()=>{
      const drug=name.value.trim();
      try{
        if(typeof getCurrentPrice==='function'){
          const old=getCurrentPrice(drug);
          if(old!=null && !price.value)price.value=old;
        }
      }catch(e){}
      syncAndCalc();
    });
    qty.addEventListener('input',syncAndCalc);
    price.addEventListener('input',syncAndCalc);

    $('#ptpAddItem').onclick=()=>{
      const drug=name.value.trim();
      const q=Math.max(0,Number(qty.value)||0);
      const p=Math.max(0,Number(price.value)||0);
      if(!drug){alert('약 이름을 입력해주세요.');name.focus();return;}
      if(!q){alert('PTP 수량을 입력해주세요.');qty.focus();return;}
      if(p<0 || price.value===''){alert('1T당 반품금액을 입력해주세요.');price.focus();return;}

      try{
        // v25의 실제 품목 자료구조와 동일하게 저장
        draftItems.push({
          id:typeof uid==='function'?uid():('x'+Date.now()),
          drug,
          qty:q,
          unitPrice:p,
          total:q*p,
          photo:'',
          countShots:[],
          inputMode:'ptp'
        });
        if(typeof savePriceVersion==='function')savePriceVersion(drug,p,typeof today==='function'?today():new Date().toISOString().slice(0,10));
        if(typeof rememberRecent==='function')rememberRecent(drug);
        if(typeof refreshMaster==='function')refreshMaster();
        if(typeof renderDraft==='function')renderDraft();

        // 다음 PTP 약 입력을 위해 비움
        name.value='';qty.value='';price.value='';
        $('#ptpTotal').textContent='0원';$('#ptpFormula').textContent='';
        if($('#drugName'))$('#drugName').value='';
        if($('#qty'))$('#qty').value='';
        if($('#unitPrice'))$('#unitPrice').value='';
        name.focus();
      }catch(err){
        console.error(err);
        alert('PTP 약 추가 중 오류가 발생했습니다: '+(err.message||err));
      }
    };
  }

  function setMode(mode){
    ensurePanel();
    ptpMode=mode==='ptp';

    const looseBtn=$('#modeLoose'),ptpBtn=$('#modePTP');
    if(looseBtn)looseBtn.className=ptpMode?'secondary':'primary';
    if(ptpBtn)ptpBtn.className=ptpMode?'primary':'secondary';

    const p=$('#ptpEntryPanel');
    const loosePhoto=$('#loosePhotoSection');
    const shots=$('#shotHistoryCard');

    if(p)p.classList.toggle('hidden',!ptpMode);
    if(loosePhoto)loosePhoto.classList.toggle('hidden',ptpMode);
    if(shots)shots.classList.toggle('hidden',ptpMode);

    // 기존 공용 입력카드는 PTP일 때 숨김: 한 줄처럼 헷갈리지 않게 완전 분리
    const common=$('#drugName')?.closest('section.card');
    if(common)common.classList.toggle('hidden',ptpMode);

    const help=$('#ptpHelp');
    if(help)help.classList.toggle('hidden',true);

    if(ptpMode)setTimeout(()=>$('#ptpDrugName')?.focus(),50);
  }

  function wire(){
    ensurePanel();
    const loose=$('#modeLoose'),ptp=$('#modePTP');
    if(loose)loose.onclick=e=>{e.preventDefault();setMode('loose');};
    if(ptp)ptp.onclick=e=>{e.preventDefault();setMode('ptp');};
    setMode('loose');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
