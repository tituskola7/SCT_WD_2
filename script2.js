/**
 * Precision Calc Architecture Engine
 * Safely parses layout input strings and executes operations without unsafe eval() handlers.
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // Core Display View Target Cache
    const currentView = document.getElementById('current-view');
    const expressionView = document.getElementById('expression-view');
    const historyLog = document.getElementById('history-log');
    
    // State Tracking Variables
    let currentInput = '0';
    let isEvaluationComplete = false;

    // Supported Mathematical Operators Lookup Map
    const operators = ['+', '-', '*', '/'];

    /* ==========================================================================
       1. Core Calculator State Machine Operations
       ========================================================================== */
    
    function appendNumber(num) {
        // Reset current working buffer clear states post evaluations
        if (currentInput === '0' && num !== '.' || isEvaluationComplete) {
            currentInput = num;
            isEvaluationComplete = false;
        } else {
            // Prevent multiple adjacent decimals inside a sub-expression scope
            if (num === '.') {
                const parts = currentInput.split(/[\+\-\*\/]/);
                const currentSegment = parts[parts.length - 1];
                if (currentSegment.includes('.')) return; 
            }
            currentInput += num;
        }
        updateUI();
    }

    function appendOperator(op) {
        if (isEvaluationComplete) isEvaluationComplete = false;
        
        const lastChar = currentInput.trim().slice(-1);

        // Prevent calculating empty strings using an operator base profile
        if (currentInput === '0' && (op === '*' || op === '/')) return;

        // Overwrite standard operator if clicked sequentially instead of stacking errors
        if (operators.includes(lastChar)) {
            currentInput = currentInput.trim().slice(0, -1) + op;
        } else {
            currentInput += op;
        }
        updateUI();
    }

    function clearAll() {
        currentInput = '0';
        expressionView.textContent = '';
        isEvaluationComplete = false;
        updateUI();
    }

    function handleBackspace() {
        if (isEvaluationComplete) {
            clearAll();
            return;
        }
        
        if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
        } else {
            currentInput = '0';
        }
        updateUI();
    }

    function computeSpecial(type) {
        try {
            // Compute current view evaluation values first if chain elements exist
            const baseValue = parseFloat(safeEvaluate(currentInput));
            if (isNaN(baseValue)) throw new Error("Invalid Expression");

            let result;
            let label;

            if (type === 'sqrt') {
                if (baseValue < 0) {
                    showError("Invalid Expression");
                    return;
                }
                result = Math.sqrt(baseValue);
                label = `√(${baseValue})`;
            } else if (type === 'percent') {
                result = baseValue / 100;
                label = `${baseValue}%`;
            }

            // Format float strings dynamically
            result = parseFloat(result.toFixed(8)).toString();
            
            expressionView.textContent = label;
            pushHistoryItem(label, result);
            currentInput = result;
            isEvaluationComplete = true;
            updateUI();
        } catch (err) {
            showError(err.message);
        }
    }

    function processCalculation() {
        if (currentInput === '0') {
            showError("Enter a calculation");
            return;
        }

        const lastChar = currentInput.trim().slice(-1);
        if (operators.includes(lastChar)) {
            showError("Invalid Expression");
            return;
        }

        try {
            const expressionToEvaluate = currentInput;
            const finalResult = safeEvaluate(expressionToEvaluate);

            expressionView.textContent = expressionToEvaluate.replace(/\*/g, '×').replace(/\//g, '÷');
            pushHistoryItem(expressionView.textContent, finalResult);
            
            currentInput = finalResult;
            isEvaluationComplete = true;
            updateUI();
        } catch (error) {
            showError(error.message);
        }
    }

    /* ==========================================================================
       2. Safe Parsing Evaluation Processing Engine (No eval)
       ========================================================================== */
    function safeEvaluate(str) {
        // Tokenize numbers and operators using a regular expression split architecture
        const tokens = str.match(/([0-9.]+)|([\+\-\*\/])/g);
        if (!tokens) throw new Error("Invalid Expression");

        // Parse Phase 1: High Priority Operations (Multiplication & Division)
        let values = [];
        let i = 0;
        while (i < tokens.length) {
            let token = tokens[i];
            if (token === '*' || token === '/') {
                let prevNum = parseFloat(values.pop());
                let nextNum = parseFloat(tokens[++i]);
                
                if (isNaN(nextNum)) throw new Error("Invalid Expression");
                
                if (token === '/') {
                    if (nextNum === 0) throw new Error("Cannot divide by zero");
                    values.push(prevNum / nextNum);
                } else {
                    values.push(prevNum * nextNum);
                }
            } else {
                values.push(token);
            }
            i++;
        }

        // Parse Phase 2: Low Priority Operations (Addition & Subtraction)
        let total = parseFloat(values[0]);
        if (isNaN(total)) throw new Error("Invalid Expression");

        let j = 1;
        while (j < values.length) {
            let operator = values[j];
            let nextVal = parseFloat(values[j + 1]);
            
            if (isNaN(nextVal)) throw new Error("Invalid Expression");
            
            if (operator === '+') total += nextVal;
            if (operator === '-') total -= nextVal;
            j += 2;
        }

        // Prevent precision layout bloat issues (e.g., 0.1 + 0.2 = 0.30000000000000004)
        return parseFloat(total.toFixed(8)).toString();
    }

    /* ==========================================================================
       3. UI Renderer & Error Layout Management Elements
       ========================================================================== */
    function updateUI() {
        // Convert internal math characters to user-friendly symbols
        let formattedInput = currentInput.replace(/\*/g, '×').replace(/\//g, '÷');
        currentView.textContent = formattedInput;
    }

    function showError(message) {
        currentView.textContent = message;
        expressionView.textContent = '';
        currentInput = '0';
        isEvaluationComplete = true;
    }

    /* ==========================================================================
       4. Side Panel Calculation Logs Module (History Module)
       ========================================================================== */
    function pushHistoryItem(exp, res) {
        const emptyMsg = historyLog.querySelector('.empty-msg');
        if (emptyMsg) emptyMsg.remove();

        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-item-exp">${exp} =</div>
            <div class="history-item-res">${res}</div>
        `;

        // Click a history entry to reload that calculated answer back to the display input buffer
        item.addEventListener('click', () => {
            currentInput = res;
            isEvaluationComplete = false;
            updateUI();
        });

        historyLog.prepend(item);
    }

    document.getElementById('clear-history').addEventListener('click', () => {
        historyLog.innerHTML = '<p class="empty-msg">No recent calculations</p>';
    });

    /* ==========================================================================
       5. Event Handlers Configuration Section (DOM & Keyboards)
       ========================================================================== */
    
    // Keypad Click Event Routing Router
    document.querySelector('.keypad').addEventListener('click', (e) => {
        const target = e.target.closest('.btn');
        if (!target) return;

        if (target.classList.contains('btn-num')) {
            appendNumber(target.dataset.val);
        } else if (target.classList.contains('btn-operator')) {
            const op = target.dataset.operator;
            const action = target.dataset.action;
            if (op) appendOperator(op);
            if (action) computeSpecial(action);
        } else if (target.classList.contains('btn-control')) {
            const action = target.dataset.action;
            if (action === 'clear') clearAll();
            if (action === 'backspace') handleBackspace();
            if (action === 'percent') computeSpecial('percent');
        } else if (target.classList.contains('btn-equals')) {
            processCalculation();
        }
    });

    // Native Mechanical Keyboard Matrix Listener Binding Maps
    window.addEventListener('keydown', (e) => {
        // Block native windows window-shifts or focus updates while computing tasks
        if (e.key === 'Enter') e.preventDefault(); 

        let keyTargetId = null;

        if (/[0-9.]/.test(e.key)) {
            appendNumber(e.key);
        } else if (e.key === '+') {
            appendOperator('+');
            keyTargetId = 'key-add';
        } else if (e.key === '-') {
            appendOperator('-');
            keyTargetId = 'key-subtract';
        } else if (e.key === '*') {
            appendOperator('*');
            keyTargetId = 'key-multiply';
        } else if (e.key === '/') {
            appendOperator('/');
            keyTargetId = 'key-divide';
        } else if (e.key === '%') {
            computeSpecial('percent');
            keyTargetId = 'key-percent';
        } else if (e.key === 'Enter' || e.key === '=') {
            processCalculation();
            keyTargetId = 'key-equals';
        } else if (e.key === 'Backspace') {
            handleBackspace();
            keyTargetId = 'key-backspace';
        } else if (e.key === 'Escape') {
            clearAll();
            keyTargetId = 'key-clear';
        }

        // Apply a visual active state flash effect for physical keyboard inputs
        if (keyTargetId) {
            const btnEl = document.getElementById(keyTargetId);
            if (btnEl) {
                btnEl.classList.add('active-click');
                setTimeout(() => btnEl.classList.remove('active-click'), 150);
            }
        }
    });

    // Copy to Clipboard Action Integration
    document.getElementById('copy-button').addEventListener('click', () => {
        if (currentInput !== '0' && !operators.some(op => currentInput.includes(op))) {
            navigator.clipboard.writeText(currentView.textContent);
            
            // Fast tooltip transition animation hint confirmation feedback
            const icon = document.querySelector('#copy-button i');
            icon.className = 'fa-solid fa-check';
            icon.style.color = '#10b981';
            
            setTimeout(() => {
                icon.className = 'fa-regular fa-copy';
                icon.style.color = '';
            }, 1500);
        }
    });
});