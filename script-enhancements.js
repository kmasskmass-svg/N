/* =====================================================================
   script-enhancements.js
   طبقة تحسينات إضافية لموقع "رحلتي في الإنجليزي" — SuperGoal 2

   قواعد صارمة لهذا الملف:
   - لا يُعرَّف أي متغيّر أو دالة إلا بادئة "sg2Enhance" لتفادي أي تعارض
     مع أسماء موجودة في v2_logic.js (مثل goTo, render, toggleTheme...).
   - لا يُعاد تعريف أي دالة موجودة مسبقًا؛ هذا الملف يقرأ فقط من
     الحالة العامة الموجودة (progress, UNITS, overallMasteryPct, ...)
     إن وُجدت، ولا يُعدّلها مباشرة.
   - أي مفتاح جديد يُخزَّن في localStorage من هذا الملف نفسه يحمل
     بادئة "sg2Enhance_" حتى لا يتعارض مع مفاتيح الموقع الأصلية
     (sg2v2_...). القراءة فقط تكون من مفاتيح الموقع الأصلية.
   - كل شيء هنا محاط بمحاولات try/catch حتى لا يكسر أي خطأ هنا
     عمل بقية الموقع.
   ===================================================================== */
(function(){
  "use strict";

  /* ---------------------------------------------------------------
     أدوات مساعدة عامة (كلها بادئتها sg2Enhance)
     --------------------------------------------------------------- */
  var sg2EnhanceDismissKey  = "sg2Enhance_dismissedRoute"; // آخر مسار أغلق المستخدم بطاقته يدويًا
  var sg2EnhancePrevRouteKey = "sg2Enhance_prevRoute";     // تتبّع خاص بهذا الملف لآخر مسار "حقيقي" مختلف

  function sg2EnhanceSafeGetLS(key){
    try{ return localStorage.getItem(key); }catch(e){ return null; }
  }
  function sg2EnhanceSafeSetLS(key, val){
    try{ localStorage.setItem(key, val); }catch(e){ /* تجاهل بصمت */ }
  }
  function sg2EnhanceSafeJSON(str, fallback){
    try{ var v = JSON.parse(str); return v==null ? fallback : v; }catch(e){ return fallback; }
  }

  /* ---------------------------------------------------------------
     قراءة بيانات التقدّم الموجودة فعليًا في localStorage/الحالة
     العامة (بدون أي تعديل عليها).
     --------------------------------------------------------------- */
  function sg2EnhanceGetUnits(){
    try{
      if(typeof UNITS !== 'undefined' && Array.isArray(UNITS)) return UNITS;
    }catch(e){}
    return null;
  }

  function sg2EnhanceGetUnitIcon(number){
    try{
      if(typeof UNIT_ICONS !== 'undefined' && UNIT_ICONS[number]) return UNIT_ICONS[number];
    }catch(e){}
    return '📘';
  }

  function sg2EnhanceGetMasteryPct(){
    // المصدر الأول: الدالة الأصلية في الموقع إن كانت متاحة (استدعاء قراءة فقط، لا إعادة تعريف)
    try{
      if(typeof overallMasteryPct === 'function') return overallMasteryPct();
    }catch(e){}
    // خطة بديلة: قراءة sg2v2_progress مباشرة من localStorage وحساب المتوسط يدويًا
    try{
      var units = sg2EnhanceGetUnits();
      var raw = sg2EnhanceSafeJSON(sg2EnhanceSafeGetLS('sg2v2_progress'), {});
      if(!units || !units.length) return 0;
      var sum = 0;
      units.forEach(function(u){
        var p = raw['u' + u.id];
        var pct = (p && p.total > 0) ? (p.score / p.total) : 0;
        sum += pct;
      });
      return Math.round((sum / units.length) * 100);
    }catch(e){ return 0; }
  }

  var SG2_ROUTE_LABELS = {
    glossary: 'القاموس الشامل',
    daily: 'تحدي اليوم',
    irregular: 'الأفعال الشاذة',
    final: 'الاختبار الشامل',
    weak: 'كلماتي الصعبة',
    weakcards: 'بطاقات كلماتي الصعبة'
  };

  // يحوّل مسارًا مثل "#/unit/3/vocab" إلى معلومات عرض بسيطة (أيقونة + عنوان)
  function sg2EnhanceDescribeRoute(hash){
    try{
      var h = String(hash || '').replace(/^#\/?/, '');
      var parts = h.split('/').filter(Boolean);
      if(parts.length === 0) return null;
      if(parts[0] === 'unit'){
        var id = parseInt(parts[1], 10);
        var units = sg2EnhanceGetUnits();
        var u = units ? units.filter(function(x){ return x.id === id; })[0] : null;
        if(!u) return null;
        return { icon: sg2EnhanceGetUnitIcon(u.number), title: u.titleAr };
      }
      if(SG2_ROUTE_LABELS[parts[0]]){
        return { icon: '🔖', title: SG2_ROUTE_LABELS[parts[0]] };
      }
      return null;
    }catch(e){ return null; }
  }

  /* ---------------------------------------------------------------
     1) شريط التقدّم الثابت أعلى الصفحة
     --------------------------------------------------------------- */
  var sg2EnhanceBarFillEl = null;

  function sg2EnhanceBuildProgressBar(){
    if(document.getElementById('sg2EnhanceProgressBar')) return; // لا يُعاد إنشاؤه إن وُجد
    var bar = document.createElement('div');
    bar.id = 'sg2EnhanceProgressBar';
    bar.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('div');
    fill.className = 'fill';
    bar.appendChild(fill);
    document.body.appendChild(bar);
    sg2EnhanceBarFillEl = fill;
    sg2EnhanceUpdateProgressBar();
  }

  function sg2EnhanceUpdateProgressBar(){
    try{
      if(!sg2EnhanceBarFillEl) return;
      var pct = sg2EnhanceGetMasteryPct();
      if(isNaN(pct) || pct < 0) pct = 0;
      if(pct > 100) pct = 100;
      sg2EnhanceBarFillEl.style.width = pct + '%';
    }catch(e){}
  }

  /* ---------------------------------------------------------------
     2) بطاقة "استئناف التعلم"
     تعتمد على تتبّع خاص بهذا الملف (sg2Enhance_prevRoute) لمعرفة
     آخر مسار "حقيقي" مختلف زاره المستخدم — لأن مفتاح الموقع الأصلي
     (sg2v2_lastroute) يُحدَّث مع كل عملية render() ليعكس دائمًا
     المسار الحالي نفسه (وهذا مصمَّم أصلاً لأجل ميزة إعادة التوجيه
     التلقائي في الموقع)، فلا يصلح وحده لمعرفة "من أين أتى" المستخدم.
     --------------------------------------------------------------- */
  var sg2EnhanceCardEl = null;
  var sg2EnhanceOfferedRoute = null;

  function sg2EnhanceBuildResumeCard(){
    if(document.getElementById('sg2EnhanceResumeCard')) return;
    var card = document.createElement('div');
    card.id = 'sg2EnhanceResumeCard';
    card.innerHTML =
      '<div class="sg2-ic">⏪</div>' +
      '<div class="sg2-body">' +
        '<p class="sg2-eyebrow">استئناف التعلم</p>' +
        '<p class="sg2-title" id="sg2EnhanceResumeTitle"></p>' +
        '<div class="sg2-actions">' +
          '<button type="button" class="sg2-continue" id="sg2EnhanceContinueBtn">متابعة ←</button>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="sg2-dismiss" id="sg2EnhanceDismissBtn" aria-label="إغلاق">✕</button>';
    document.body.appendChild(card);
    sg2EnhanceCardEl = card;

    var continueBtn = document.getElementById('sg2EnhanceContinueBtn');
    var dismissBtn = document.getElementById('sg2EnhanceDismissBtn');
    if(continueBtn){
      continueBtn.addEventListener('click', function(){
        if(sg2EnhanceOfferedRoute){
          try{
            if(typeof goTo === 'function'){ goTo(sg2EnhanceOfferedRoute.replace(/^#/, '')); }
            else{ location.hash = sg2EnhanceOfferedRoute; }
          }catch(e){ location.hash = sg2EnhanceOfferedRoute; }
        }
        sg2EnhanceHideResumeCard();
      });
    }
    if(dismissBtn){
      dismissBtn.addEventListener('click', function(){
        if(sg2EnhanceOfferedRoute) sg2EnhanceSafeSetLS(sg2EnhanceDismissKey, sg2EnhanceOfferedRoute);
        sg2EnhanceHideResumeCard();
      });
    }
  }

  function sg2EnhanceShowResumeCard(info, route){
    if(!sg2EnhanceCardEl) return;
    var titleEl = document.getElementById('sg2EnhanceResumeTitle');
    if(titleEl) titleEl.textContent = info.icon + ' ' + info.title;
    sg2EnhanceOfferedRoute = route;
    sg2EnhanceCardEl.classList.add('sg2-show');
  }
  function sg2EnhanceHideResumeCard(){
    if(!sg2EnhanceCardEl) return;
    sg2EnhanceCardEl.classList.remove('sg2-show');
  }

  // explicitOldHash: يُمرَّر من مستمع hashchange (event.oldURL) عندما يتوفر،
  // وإلا يُستخدم التتبّع الخاص المخزَّن من زيارة سابقة.
  function sg2EnhanceEvaluateResumeCard(explicitOldHash){
    try{
      var currentHash = location.hash || '#/';
      var candidate = explicitOldHash || sg2EnhanceSafeGetLS(sg2EnhancePrevRouteKey);

      // حدّث تتبّعنا الخاص دائمًا إلى المسار الحالي استعدادًا للزيارة/التنقل القادم
      sg2EnhanceSafeSetLS(sg2EnhancePrevRouteKey, currentHash);

      if(!candidate || candidate === currentHash || candidate === '#/' || candidate === '#'){
        sg2EnhanceHideResumeCard(); return;
      }
      var dismissed = sg2EnhanceSafeGetLS(sg2EnhanceDismissKey);
      if(dismissed === candidate){ sg2EnhanceHideResumeCard(); return; }
      var info = sg2EnhanceDescribeRoute(candidate);
      if(!info){ sg2EnhanceHideResumeCard(); return; }
      sg2EnhanceShowResumeCard(info, candidate);
    }catch(e){}
  }

  /* ---------------------------------------------------------------
     3) ربط الأحداث — دون التدخل في أي مستمع/دالة موجودة مسبقًا
     --------------------------------------------------------------- */
  function sg2EnhanceOnRouteChange(evt){
    var oldHash = null;
    try{
      if(evt && evt.oldURL){
        var idx = evt.oldURL.indexOf('#');
        oldHash = idx >= 0 ? evt.oldURL.slice(idx) : null;
      }
    }catch(e){}
    sg2EnhanceUpdateProgressBar();
    sg2EnhanceEvaluateResumeCard(oldHash);
  }

  function sg2EnhanceInit(){
    try{
      sg2EnhanceBuildProgressBar();
      sg2EnhanceBuildResumeCard();
      sg2EnhanceEvaluateResumeCard();
      // مستمع إضافي منفصل تمامًا عن أي مستمع hashchange موجود مسبقًا
      window.addEventListener('hashchange', sg2EnhanceOnRouteChange);
      // فحص دوري خفيف لتحديث شريط التقدم بعد إكمال اختبار دون تغيّر الرابط
      setInterval(sg2EnhanceUpdateProgressBar, 6000);
    }catch(e){
      /* لا نسمح لأي خطأ هنا بالوصول إلى بقية الصفحة */
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', sg2EnhanceInit);
  } else {
    sg2EnhanceInit();
  }

  // واجهة عامة صغيرة (اختيارية) بنفس بادئة الملف، بدون تعريض أي شيء
  // قد يتعارض مع النطاق العام للموقع.
  window.sg2Enhance = {
    getMasteryPct: sg2EnhanceGetMasteryPct,
    refresh: sg2EnhanceOnRouteChange
  };
})();
