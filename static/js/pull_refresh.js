// Pull-to-refresh component for mobile
(function() {
    // Don't initialize on desktop
    if (window.innerWidth > 768 && !('ontouchstart' in window)) return;

    var THRESHOLD = 80; // px to trigger refresh
    var MAX_PULL = 120; // max visual pull distance

    // Create indicator element
    var indicator = document.createElement('div');
    indicator.id = 'pull-refresh-indicator';
    indicator.innerHTML = '<div class="pr-spinner"><svg viewBox="0 0 24 24" width="24" height="24"><path class="pr-arrow" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" fill="#666"/></svg></div><div class="pr-text">下拉刷新</div>';
    
    var style = document.createElement('style');
    style.textContent = '\
        #pull-refresh-indicator {\
            position: fixed; top: 0; left: 0; right: 0; z-index: 9999;\
            display: flex; align-items: center; justify-content: center; flex-direction: column;\
            height: 0; overflow: hidden; background: white;\
            transition: height 0.3s ease, opacity 0.3s ease;\
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);\
            opacity: 0;\
        }\
        #pull-refresh-indicator.visible { opacity: 1; }\
        #pull-refresh-indicator.refreshing { height: 50px !important; opacity: 1; }\
        .pr-spinner { transition: transform 0.3s ease; }\
        .pr-spinner.ready { transform: rotate(180deg); }\
        .pr-spinner.spinning { animation: pr-spin 0.8s linear infinite; }\
        @keyframes pr-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }\
        .pr-text { font-size: 12px; color: #999; margin-top: 4px; }\
    ';
    document.head.appendChild(style);
    document.body.appendChild(indicator);

    var startY = 0, pulling = false, refreshing = false;
    var scrollTop = 0;

    function isExamPage() {
        return /\/exam\/\d+/.test(window.location.pathname);
    }

    function getScrollTop() {
        return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }

    function onScrollable() {
        // Check if we can scroll up - only allow pull when at the very top
        return getScrollTop() <= 0;
    }

    document.addEventListener('touchstart', function(e) {
        if (refreshing) return;
        // For exam page, check if touching inside question-panel (which has its own scroll)
        if (isExamPage()) {
            var panel = document.querySelector('.question-panel');
            if (panel && panel.contains(e.target)) {
                if (panel.scrollTop > 0) return;
            }
        }
        if (!onScrollable()) return;
        startY = e.touches[0].pageY;
        pulling = false;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        if (refreshing) return;
        if (!startY) return;
        
        var diff = e.touches[0].pageY - startY;
        if (diff <= 0) {
            indicator.style.height = '0px';
            indicator.classList.remove('visible');
            pulling = false;
            return;
        }

        if (!onScrollable() && !pulling) return;

        pulling = true;
        var pull = Math.min(diff * 0.5, MAX_PULL); // rubber band effect
        indicator.style.height = pull + 'px';
        indicator.classList.add('visible');

        var spinner = indicator.querySelector('.pr-spinner');
        var text = indicator.querySelector('.pr-text');
        if (pull >= THRESHOLD) {
            spinner.classList.add('ready');
            text.textContent = '释放刷新';
        } else {
            spinner.classList.remove('ready');
            text.textContent = '下拉刷新';
        }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
        if (!pulling || refreshing) return;
        pulling = false;

        var height = parseInt(indicator.style.height) || 0;
        var spinner = indicator.querySelector('.pr-spinner');
        var text = indicator.querySelector('.pr-text');

        if (height >= THRESHOLD) {
            // Trigger refresh
            refreshing = true;
            indicator.classList.add('refreshing');
            spinner.classList.remove('ready');
            spinner.classList.add('spinning');
            text.textContent = '刷新中...';

            // On exam page, confirm before refresh
            if (isExamPage()) {
                var answers = window.getUnsavedCount ? window.getUnsavedCount() : 0;
                if (answers > 0) {
                    if (!confirm('刷新页面将丢失未保存的答题进度，确定继续？')) {
                        cancelRefresh();
                        return;
                    }
                }
            }

            setTimeout(function() {
                location.reload();
            }, 300);
        } else {
            cancelRefresh();
        }

        startY = 0;
    }, { passive: true });

    function cancelRefresh() {
        indicator.style.height = '0px';
        indicator.classList.remove('visible', 'refreshing');
        var spinner = indicator.querySelector('.pr-spinner');
        spinner.classList.remove('ready', 'spinning');
        var text = indicator.querySelector('.pr-text');
        text.textContent = '下拉刷新';
        refreshing = false;
    }
})();
