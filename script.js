class Calculator {
    constructor() {
        this.expressionDisplay = document.getElementById('expressionDisplay');
        this.resultDisplay = document.getElementById('resultDisplay');
        this.keypad = document.querySelector('.keypad');
        
        // State
        this.currentInput = '0';
        this.expression = '';
        this.operator = null;
        this.waitingForNewInput = false;
        this.decimalUsed = false;
        this.lastAction = null;
        this.memory = 0;
        this.lastResult = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateDisplay();
        this.updateMemoryIndicator();
    }
    
    bindEvents() {
        this.keypad.addEventListener('click', (e) => {
            const btn = e.target.closest('.key');
            if (!btn) return;
            this.ripple(btn);
            
            if (btn.classList.contains('number')) {
                const num = btn.dataset.number;
                if (num !== undefined) this.handleNumber(num);
                else if (btn.dataset.action === 'decimal') this.handleDecimal();
            }
            else if (btn.classList.contains('operator')) {
                this.handleOperator(btn.dataset.action);
            }
            else if (btn.classList.contains('action')) {
                const action = btn.dataset.action;
                if (action === 'clear') this.clearAll();
                else if (action === 'delete') this.deleteLast();
            }
            else if (btn.classList.contains('function')) {
                const fn = btn.dataset.action;
                if (fn === 'square-root') this.squareRoot();
                else if (fn === 'sign') this.toggleSign();
            }
            else if (btn.classList.contains('mem-action')) {
                this.memoryOperation(btn.dataset.action);
            }
            else if (btn.classList.contains('equals')) {
                this.calculate();
            }
        });
        
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    handleNumber(num) {
        if (this.currentInput === 'Error') this.clearAll();
        if (this.waitingForNewInput || this.currentInput === '0' || this.lastAction === 'equals') {
            this.currentInput = num;
            this.waitingForNewInput = false;
            this.lastAction = null;
        } else {
            if (this.currentInput.replace(/[^0-9]/g, '').length < 12)
                this.currentInput += num;
        }
        this.decimalUsed = this.currentInput.includes('.');
        this.updateDisplay();
        this.livePreview();
    }
    
    handleDecimal() {
        if (this.currentInput === 'Error') this.clearAll();
        if (this.waitingForNewInput || this.lastAction === 'equals') {
            this.currentInput = '0.';
            this.waitingForNewInput = false;
            this.lastAction = null;
        } else if (!this.decimalUsed) {
            this.currentInput += '.';
        }
        this.decimalUsed = true;
        this.updateDisplay();
        this.livePreview();
    }
    
    handleOperator(op) {
        if (this.currentInput === 'Error') this.clearAll();
        if (this.lastAction === 'equals' && this.lastResult) {
            this.expression = '';
            this.currentInput = this.lastResult;
            this.waitingForNewInput = false;
        }
        
        const symbols = { add: '+', subtract: '-', multiply: '×', divide: '÷', modulo: '%' };
        const operatorSymbol = symbols[op];
        if (!operatorSymbol) return;
        
        if (this.lastAction === 'operator' && this.expression) {
            this.expression = this.expression.slice(0, -2);
        } else if (!this.waitingForNewInput && this.currentInput !== 'Error') {
            this.expression += `${this.formatNumber(this.currentInput)} `;
        }
        
        this.expression += `${operatorSymbol} `;
        this.operator = op;
        this.waitingForNewInput = true;
        this.decimalUsed = false;
        this.lastAction = 'operator';
        this.updateDisplay();
        this.livePreview();
    }
    
    calculate() {
        if (this.currentInput === 'Error') return this.clearAll();
        let expr = this.expression;
        if (!this.waitingForNewInput && this.currentInput !== 'Error') {
            expr = this.expression + this.formatNumber(this.currentInput);
        }
        expr = expr.trim();
        const lastChar = expr[expr.length - 1];
        if (['+', '-', '×', '÷', '%'].includes(lastChar)) {
            expr = expr.slice(0, -1).trim();
        }
        if (!expr) return;
        
        try {
            let evalExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
            const result = this.safeEval(evalExpr);
            this.lastResult = this.formatResult(result);
            this.currentInput = this.lastResult;
            this.expression = expr + ' =';
            this.waitingForNewInput = true;
            this.decimalUsed = this.currentInput.includes('.');
            this.lastAction = 'equals';
            this.updateDisplay();
        } catch (err) {
            this.currentInput = 'Error';
            this.expression = '';
            this.updateDisplay();
        }
    }
    
    safeEval(expr) {
        const tokens = expr.split(' ');
        let result = parseFloat(tokens[0]);
        for (let i = 1; i < tokens.length; i += 2) {
            const op = tokens[i];
            const num = parseFloat(tokens[i + 1]);
            if (isNaN(num)) continue;
            switch (op) {
                case '+': result = this.add(result, num); break;
                case '-': result = this.subtract(result, num); break;
                case '*': result = this.multiply(result, num); break;
                case '/':
                    if (num === 0) throw new Error('Division by zero');
                    result = this.divide(result, num);
                    break;
                case '%': result = this.modulo(result, num); break;
                default: break;
            }
        }
        return result;
    }
    
    add(a, b) { return parseFloat((a + b).toPrecision(12)); }
    subtract(a, b) { return parseFloat((a - b).toPrecision(12)); }
    multiply(a, b) { return parseFloat((a * b).toPrecision(12)); }
    divide(a, b) { return parseFloat((a / b).toPrecision(12)); }
    modulo(a, b) { return parseFloat((a % b).toPrecision(12)); }
    
    squareRoot() {
        if (this.currentInput === 'Error') this.clearAll();
        let val = parseFloat(this.currentInput);
        if (isNaN(val)) return;
        if (val < 0) {
            this.currentInput = 'Error';
            this.updateDisplay();
            return;
        }
        const res = Math.sqrt(val);
        this.currentInput = this.formatResult(res);
        this.expression = `√(${this.formatNumber(val)}) =`;
        this.waitingForNewInput = true;
        this.lastAction = 'equals';
        this.updateDisplay();
    }
    
    toggleSign() {
        if (this.currentInput === 'Error' || this.currentInput === '0') return;
        let num = parseFloat(this.currentInput);
        if (isNaN(num)) return;
        num = -num;
        this.currentInput = this.formatResult(num);
        this.decimalUsed = this.currentInput.includes('.');
        this.updateDisplay();
        if (!this.waitingForNewInput && this.operator) this.livePreview();
    }
    
    memoryOperation(action) {
        const curr = parseFloat(this.currentInput);
        switch (action) {
            case 'memory-clear': this.memory = 0; break;
            case 'memory-recall':
                if (this.memory !== 0) {
                    this.currentInput = this.formatResult(this.memory);
                    this.decimalUsed = this.currentInput.includes('.');
                    this.waitingForNewInput = false;
                    this.lastAction = null;
                    this.updateDisplay();
                }
                break;
            case 'memory-add':
                if (!isNaN(curr)) this.memory = this.add(this.memory, curr);
                break;
            case 'memory-subtract':
                if (!isNaN(curr)) this.memory = this.subtract(this.memory, curr);
                break;
            default: break;
        }
        this.updateMemoryIndicator();
    }
    
    clearAll() {
        this.currentInput = '0';
        this.expression = '';
        this.operator = null;
        this.waitingForNewInput = false;
        this.decimalUsed = false;
        this.lastAction = null;
        this.lastResult = null;
        this.updateDisplay();
    }
    
    deleteLast() {
        if (this.currentInput === 'Error') return this.clearAll();
        if (this.lastAction === 'equals') return this.clearAll();
        if (this.currentInput.length > 1) {
            this.currentInput = this.currentInput.slice(0, -1);
            if (!this.currentInput.includes('.')) this.decimalUsed = false;
        } else {
            this.currentInput = '0';
            this.decimalUsed = false;
        }
        this.updateDisplay();
        this.livePreview();
    }
    
    livePreview() {
        if (this.lastAction === 'equals') return;
        if (!this.operator || this.waitingForNewInput) return;
        try {
            let preview = this.expression + this.formatNumber(this.currentInput);
            preview = preview.trim();
            const last = preview[preview.length - 1];
            if (['+', '-', '×', '÷', '%'].includes(last)) return;
            let evalPreview = preview.replace(/×/g, '*').replace(/÷/g, '/');
            const res = this.safeEval(evalPreview);
            this.resultDisplay.textContent = this.formatResult(res);
        } catch (e) {
            // Silently ignore preview errors
        }
    }
    
    formatNumber(num) {
        if (num === 'Error' || num === '∞' || num === '-∞') return num;
        const n = parseFloat(num);
        if (isNaN(n)) return '0';
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 10,
            useGrouping: true
        }).format(n);
    }
    
    formatResult(res) {
        if (!isFinite(res)) return res > 0 ? '∞' : '-∞';
        if (Math.abs(res) > 1e12 || (Math.abs(res) < 1e-6 && res !== 0)) {
            return res.toExponential(8);
        }
        let formatted = this.formatNumber(res);
        if (formatted.length > 14) {
            return parseFloat(res.toPrecision(10)).toString();
        }
        return formatted;
    }
    
    updateDisplay() {
        this.expressionDisplay.textContent = this.expression || '0';
        this.resultDisplay.textContent = this.formatNumber(this.currentInput);
    }
    
    updateMemoryIndicator() {
        const memSpan = document.getElementById('memoryStatusIcon');
        if (memSpan) {
            if (this.memory !== 0) {
                memSpan.innerHTML = '<i class="fa-solid fa-database"></i> M';
            } else {
                memSpan.innerHTML = '';
            }
        }
    }
    
    handleKeyboard(e) {
        const key = e.key;
        const validKeys = ['0','1','2','3','4','5','6','7','8','9','.','+','-','*','/','%','Enter','=','Escape','Delete','Backspace'];
        if (!validKeys.includes(key)) return;
        e.preventDefault();
        
        const map = {
            '0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
            '.':'decimal','+':'add','-':'subtract','*':'multiply','/':'divide','%':'modulo',
            'Enter':'equals','=':'equals','Escape':'clear','Delete':'clear','Backspace':'delete'
        };
        const action = map[key];
        if (!action) return;
        
        if (['0','1','2','3','4','5','6','7','8','9'].includes(key)) {
            this.handleNumber(key);
        } else if (key === '.') {
            this.handleDecimal();
        } else if (['+','-','*','/','%'].includes(key)) {
            this.handleOperator(action);
        } else if (action === 'equals') {
            this.calculate();
        } else if (action === 'clear') {
            this.clearAll();
        } else if (action === 'delete') {
            this.deleteLast();
        }
        
        const btn = document.querySelector(`[data-action="${action}"]`) || document.querySelector(`[data-number="${key}"]`);
        if (btn) this.ripple(btn);
    }
    
    ripple(btn) {
        btn.classList.remove('ripple');
        void btn.offsetWidth;
        btn.classList.add('ripple');
        setTimeout(() => btn.classList.remove('ripple'), 400);
    }
}

document.addEventListener('DOMContentLoaded', () => new Calculator());
