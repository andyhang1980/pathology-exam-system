// Anti-copy & Anti-screenshot protection
(function() {
    // ========================================
    // 1. Anti-copy: disable text selection, copy, cut, right-click, drag
    // ========================================
    
    var noSelectStyle = document.createElement('style');
    noSelectStyle.textContent = 
        'body { -webkit-user-select: none !important; -moz-user-select: none !important; -ms-user-select: none !important; user-select: none !important; }' +
        'img { -webkit-user-drag: none; pointer-events: none; }';
    document.head.appendChild(noSelectStyle);

    document.addEventListener('copy', function(e) { e.preventDefault(); }, false);
    document.addEventListener('cut', function(e) { e.preventDefault(); }, false);
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; }, false);
    document.addEventListener('selectstart', function(e) { e.preventDefault(); }, false);
    document.addEventListener('dragstart', function(e) { e.preventDefault(); }, false);

    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'a') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.key === 'c') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.key === 'p') { e.preventDefault(); return false; }
        if (e.key === 'F12') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && /^[IJC]$/i.test(e.key)) { e.preventDefault(); return false; }
    }, false);

    // ========================================
    // 2. Anti-screenshot (exam page only)
    // ========================================
    
    function isExamPage() {
        return /\/exam\/\d+/.test(window.location.pathname);
    }

    if (!isExamPage()) {
        // Non-exam pages: only anti-copy
        var printStyle = document.createElement('style');
        printStyle.textContent = '@media print { body { display: none !important; } }';
        document.head.appendChild(printStyle);
        return;
    }

    // ---- Exam page: full anti-screenshot + anti-copy ----

    var overlay = document.createElement('div');
    overlay.id = 'anti-screenshot-overlay';
    overlay.style.cssText = 
        'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;' +
        'background:#1a202c;display:none;align-items:center;justify-content:center;flex-direction:column;' +
        'transition:opacity 0.15s ease;';
    overlay.innerHTML = 
        '<svg viewBox="0 0 24 24" width="48" height="48" style="margin-bottom:16px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#f59e0b"/></svg>' +
        '<div style="color:#f59e0b;font-size:18px;font-weight:600;margin-bottom:8px">考试进行中</div>' +
        '<div style="color:#a0aec0;font-size:14px">请返回考试页面继续答题</div>';
    document.body.appendChild(overlay);

    var switchCount = 0;
    var overlayVisible = false;

    function showOverlay() {
        if (overlayVisible) return;
        overlayVisible = true;
        overlay.style.display = 'flex';
        switchCount++;
    }

    function hideOverlay() {
        if (!overlayVisible) return;
        overlayVisible = false;
        overlay.style.display = 'none';
    }

    // Strategy 1: visibilitychange — detect tab switch, app switch, notification pull-down
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            showOverlay();
        } else {
            // Small delay to ensure overlay was visible in any screenshot taken
            setTimeout(hideOverlay, 300);
        }
    });

    // Strategy 2: window blur/focus — detect Alt+Tab, click outside
    window.addEventListener('blur', function() {
        showOverlay();
    });
    window.addEventListener('focus', function() {
        setTimeout(hideOverlay, 300);
    });

    // Strategy 3: Periodic screen guard — briefly flash overlay every few seconds
    // This makes it extremely difficult to time a screenshot that captures content
    var guardInterval = null;
    var guardActive = false;

    function startScreenGuard() {
        if (guardActive) return;
        guardActive = true;
        // Random interval between 3-8 seconds
        function scheduleNext() {
            var delay = 3000 + Math.random() * 5000;
            guardInterval = setTimeout(function() {
                if (!overlayVisible) {
                    // Flash overlay for 120-200ms — too fast to read, ruins screenshot
                    overlay.style.display = 'flex';
                    var flashTime = 120 + Math.random() * 80;
                    setTimeout(function() {
                        if (!document.hidden && document.hasFocus()) {
                            overlay.style.display = 'none';
                        }
                    }, flashTime);
                }
                scheduleNext();
            }, delay);
        }
        scheduleNext();
    }

    function stopScreenGuard() {
        guardActive = false;
        if (guardInterval) {
            clearTimeout(guardInterval);
            guardInterval = null;
        }
    }

    // Strategy 4: Detect screenshot key combos
    // Android: Power+VolumeDown doesn't fire JS events, but we can detect the result
    // iOS: Power+Home / Power+VolumeUp similarly invisible to JS
    // Best we can do: detect when page comes back after losing focus

    // Strategy 5: Monitor clipboard — if screenshot was copied to clipboard, clear it
    document.addEventListener('keyup', function(e) {
        if (e.key === 'PrintScreen') {
            showOverlay();
            navigator.clipboard && navigator.clipboard.writeText('').catch(function(){});
            setTimeout(hideOverlay, 500);
        }
    });

    // Strategy 6: Periodic clipboard clear (Android sometimes puts screenshots in clipboard)
    setInterval(function() {
        try { navigator.clipboard && navigator.clipboard.readText().then(function(text) {
            if (text && text.length > 100) {
                navigator.clipboard.writeText('');
            }
        }); } catch(e) {}
    }, 2000);

    // Strategy 7: Detect rapid visibility changes (screenshot pattern on Android)
    // Android: pulling down notification shade or recent apps triggers visibilitychange
    var lastHiddenTime = 0;
    var rapidSwitchCount = 0;

    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            lastHiddenTime = Date.now();
        } else {
            var gap = Date.now() - lastHiddenTime;
            // If page was hidden for < 2 seconds, likely a quick screenshot or notification peek
            if (gap > 0 && gap < 2000) {
                rapidSwitchCount++;
                if (rapidSwitchCount >= 2) {
                    // Start the periodic screen guard to make screenshots much harder
                    startScreenGuard();
                }
            } else {
                rapidSwitchCount = Math.max(0, rapidSwitchCount - 1);
            }
        }
    });

    // Print protection
    var printStyle = document.createElement('style');
    printStyle.textContent = '@media print { body { display: none !important; } }';
    document.head.appendChild(printStyle);

    // Strategy 8: Watermark — even if screenshot succeeds, user is identifiable
    var watermarkContainer = document.createElement('div');
    watermarkContainer.id = 'exam-watermark';
    watermarkContainer.style.cssText = 
        'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99998;pointer-events:none;overflow:hidden;';
    document.body.appendChild(watermarkContainer);

    function createWatermarks() {
        // Get username from page
        var username = '';
        var headerBadges = document.querySelectorAll('.header-badge');
        if (headerBadges.length > 0) {
            username = headerBadges[0].textContent.trim();
        }
        if (!username) {
            var userEl = document.querySelector('[data-username]');
            username = userEl ? userEl.getAttribute('data-username') : '';
        }
        if (!username) username = '考生';

        var text = username + '  ' + new Date().toLocaleDateString();
        watermarkContainer.innerHTML = '';
        
        // Create grid of rotated watermark text
        for (var row = 0; row < 15; row++) {
            for (var col = 0; col < 6; col++) {
                var wm = document.createElement('div');
                wm.style.cssText = 
                    'position:absolute;color:rgba(0,0,0,0.06);font-size:13px;font-weight:600;' +
                    'white-space:nowrap;transform:rotate(-25deg);' +
                    'left:' + (col * 18 + 2) + '%;top:' + (row * 7 + 2) + '%;';
                wm.textContent = text;
                watermarkContainer.appendChild(wm);
            }
        }
    }

    // Wait for page to load, then create watermarks
    if (document.readyState === 'complete') {
        setTimeout(createWatermarks, 500);
    } else {
        window.addEventListener('load', function() {
            setTimeout(createWatermarks, 500);
        });
    }

    // Update watermarks periodically (date change, etc.)
    setInterval(createWatermarks, 60000);

    // Log switch count to server (optional, for monitoring cheating)
    // Also show warning toast for repeated switches
    var toastEl = null;

    function showSwitchWarning() {
        if (toastEl) return;
        toastEl = document.createElement('div');
        toastEl.style.cssText = 
            'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:100000;' +
            'background:rgba(239,68,68,0.95);color:white;padding:10px 20px;border-radius:8px;' +
            'font-size:14px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.2);' +
            'animation:toastSlideIn 0.3s ease;';
        toastEl.textContent = '检测到切屏行为，已记录 (第' + switchCount + '次)';
        document.body.appendChild(toastEl);
        
        var animStyle = document.createElement('style');
        animStyle.textContent = '@keyframes toastSlideIn { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }';
        document.head.appendChild(animStyle);

        setTimeout(function() {
            if (toastEl && toastEl.parentNode) {
                toastEl.style.opacity = '0';
                toastEl.style.transition = 'opacity 0.3s';
                setTimeout(function() { toastEl.remove(); toastEl = null; }, 300);
            }
        }, 3000);
    }

    // Override visibilitychange to show warnings
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && switchCount > 0) {
            showSwitchWarning();
        }
    });

})();
