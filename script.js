class Calculator {
    constructor() {
        // DOM Elements
        this.expressionDisplay = document.getElementById('expressionDisplay');
        this.resultDisplay = document.getElementById('resultDisplay');
        this.keypad = document.querySelector('.keypad');
        
        // Calculator state
        this.currentInput = '0';
        this.expression = '';
        this.operator = null;
        this.waitingForNewInput = false;
        this.decimalUsed = false;
        this.lastAction = null;
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the calculator
     */
    init() {
        this.setupEventListeners();
        this.updateDisplay();
        
        // Set initial focus for better accessibility
        this.keypad.setAttribute('tabindex', '-1');
    }
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Keypad button clicks
        this.keypad.addEventListener('click', (e) => {
            const key = e.target.closest('.key');
            if (!key) return;
            
            this.addRippleEffect(key);
            
            // Handle different key types
            if (key.classList.contains('number')) {
                const number = key.getAttribute('data-number');
                if (number !== null) {
                    this.handleNumberInput(number);
                } else if (key.getAttribute('data-action') === 'decimal') {
                    this.handleDecimalInput();
                }
            } 
            else if (key.classList.contains('operator')) {
                const action = key.getAttribute('data-action');
                this.handleOperator(action);
            }
            else if (key.classList.contains('action')) {
                const action = key.getAttribute('data-action');
                if (action === 'clear') {
                    this.clearAll();
                } else if (action === 'delete') {
                    this.deleteLastCharacter();
                }
            }
            else if (key.classList.contains('equals')) {
                this.calculateResult();
            }
        });
        
        // Keyboard support
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardInput(e);
        });
    }
    
    /**
     * Handle number input from buttons or keyboard
     * @param {string} number - The number to input
     */
    handleNumberInput(number) {
        // If we're waiting for a new input after an operator, reset
        if (this.waitingForNewInput || this.currentInput === '0' || this.currentInput === 'Error') {
            this.currentInput = number;
            this.waitingForNewInput = false;
        } else {
            // Prevent input from exceeding max length
            if (this.currentInput.length < 12) {
                this.currentInput += number;
            }
        }
        
        this.decimalUsed = this.currentInput.includes('.');
        this.updateDisplay();
        this.updateLivePreview();
    }
    
    /**
     * Handle decimal point input
     */
    handleDecimalInput() {
        // Only allow one decimal point per number
        if (!this.decimalUsed) {
            // If starting fresh with a decimal, prepend '0'
            if (this.waitingForNewInput || this.currentInput === 'Error') {
                this.currentInput = '0.';
                this.waitingForNewInput = false;
            } else {
                this.currentInput += '.';
            }
            this.decimalUsed = true;
            this.updateDisplay();
        }
    }
    
    /**
     * Handle operator input
     * @param {string} operator - The operator to apply
     */
    handleOperator(operator) {
        // If operator pressed twice, replace the last operator
        if (this.lastAction === 'operator' && this.expression) {
            // Remove the last operator from expression and replace with new one
            this.expression = this.expression.slice(0, -2); // Remove last operator and space
        } else {
            // Append current input to expression
            if (!this.waitingForNewInput) {
                this.expression += `${this.formatNumber(this.currentInput)} `;
            }
        }
        
        // Add the new operator to expression
        const operatorSymbols = {
            'add': '+',
            'subtract': '-',
            'multiply': '×',
            'divide': '÷',
            'modulo': '%'
        };
        
        this.expression += `${operatorSymbols[operator]} `;
        this.operator = operator;
        this.waitingForNewInput = true;
        this.decimalUsed = false;
        this.lastAction = 'operator';
        
        this.updateDisplay();
        this.updateLivePreview();
    }
    
    /**
     * Calculate and display the result
     */
    calculateResult() {
        if (!this.operator || this.waitingForNewInput) return;
        
        // Complete the expression with current input
        const fullExpression = this.expression + this.formatNumber(this.currentInput);
        
        try {
            // Convert display symbols to JavaScript operators
            let evalExpression = fullExpression
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/%/g, '%');
            
            // Handle division by zero
            if (evalExpression.includes('/ 0') && !evalExpression.includes('/ 0.')) {
                throw new Error('Division by zero');
            }
            
            // Evaluate with floating point precision fix
            const result = this.evaluateExpression(evalExpression);
            
            // Update display with result
            this.currentInput = this.formatResult(result);
            this.expression = fullExpression + ' =';
            this.waitingForNewInput = true;
            this.decimalUsed = this.currentInput.includes('.');
            this.lastAction = 'equals';
            
            this.updateDisplay();
        } catch (error) {
            this.currentInput = 'Error';
            this.expression = '';
            this.waitingForNewInput = true;
            this.updateDisplay();
        }
    }
    
    /**
     * Evaluate mathematical expression with floating point precision fix
     * @param {string} expression - Mathematical expression to evaluate
     * @returns {number} - Calculated result
     */
    evaluateExpression(expression) {
        // Tokenize expression
        const tokens = expression.split(' ');
        let result = parseFloat(tokens[0]);
        
        for (let i = 1; i < tokens.length; i += 2) {
            const operator = tokens[i];
            const nextNumber = parseFloat(tokens[i + 1]);
            
            if (isNaN(nextNumber)) break;
            
            // Apply operation with precision handling for floating point
            switch (operator) {
                case '+':
                    result = this.add(result, nextNumber);
                    break;
                case '-':
                    result = this.subtract(result, nextNumber);
                    break;
                case '*':
                    result = this.multiply(result, nextNumber);
                    break;
                case '/':
                    if (nextNumber === 0) throw new Error('Division by zero');
                    result = this.divide(result, nextNumber);
                    break;
                case '%':
                    result = this.modulo(result, nextNumber);
                    break;
            }
        }
        
        return result;
    }
    
    /**
     * Floating point safe addition
     */
    add(a, b) {
        return parseFloat((a + b).toPrecision(12));
    }
    
    /**
     * Floating point safe subtraction
     */
    subtract(a, b) {
        return parseFloat((a - b).toPrecision(12));
    }
    
    /**
     * Floating point safe multiplication
     */
    multiply(a, b) {
        return parseFloat((a * b).toPrecision(12));
    }
    
    /**
     * Floating point safe division
     */
    divide(a, b) {
        return parseFloat((a / b).toPrecision(12));
    }
    
    /**
     * Floating point safe modulo
     */
    modulo(a, b) {
        return parseFloat((a % b).toPrecision(12));
    }
    
    /**
     * Update the live preview of the calculation
     */
    updateLivePreview() {
        if (!this.operator || this.waitingForNewInput) return;
        
        try {
            const previewExpression = this.expression + this.formatNumber(this.currentInput);
            let evalExpression = previewExpression
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/%/g, '%');
            
            // Don't show preview if expression ends with an operator
            if (evalExpression.trim().endsWith('*') || 
                evalExpression.trim().endsWith('/') ||
                evalExpression.trim().endsWith('+') ||
                evalExpression.trim().endsWith('-') ||
                evalExpression.trim().endsWith('%')) {
                return;
            }
            
            const result = this.evaluateExpression(evalExpression);
            this.resultDisplay.textContent = this.formatResult(result);
        } catch (error) {
            // If preview fails, just show current input
            this.resultDisplay.textContent = this.formatNumber(this.currentInput);
        }
    }
    
    /**
     * Clear all calculator state
     */
    clearAll() {
        this.currentInput = '0';
        this.expression = '';
        this.operator = null;
        this.waitingForNewInput = false;
        this.decimalUsed = false;
        this.lastAction = null;
        this.updateDisplay();
    }
    
    /**
     * Delete the last character from current input
     */
    deleteLastCharacter() {
        if (this.currentInput === 'Error') {
            this.clearAll();
            return;
        }
        
        if (this.currentInput.length > 1) {
            this.currentInput = this.currentInput.slice(0, -1);
            
            // If we deleted a decimal point, reset decimal flag
            if (!this.currentInput.includes('.')) {
                this.decimalUsed = false;
            }
        } else {
            this.currentInput = '0';
            this.decimalUsed = false;
        }
        
        this.updateDisplay();
        this.updateLivePreview();
    }
    
    /**
     * Format a number with thousands separators
     * @param {string|number} num - Number to format
     * @returns {string} - Formatted number
     */
    formatNumber(num) {
        if (num === 'Error' || num === 'Infinity') return num;
        
        const number = parseFloat(num);
        if (isNaN(number)) return '0';
        
        // Use Intl.NumberFormat for locale-aware formatting
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 10,
            useGrouping: true
        }).format(number);
    }
    
    /**
     * Format calculation result with appropriate precision
     * @param {number} result - Result to format
     * @returns {string} - Formatted result
     */
    formatResult(result) {
        if (!isFinite(result)) {
            return result > 0 ? 'Infinity' : '-Infinity';
        }
        
        // Handle very large/small numbers with scientific notation
        if (Math.abs(result) > 1e12 || (Math.abs(result) < 1e-6 && result !== 0)) {
            return result.toExponential(6);
        }
        
        // Format with appropriate decimal places
        const formatted = this.formatNumber(result);
        
        // Limit display length
        if (formatted.length > 12) {
            return parseFloat(result.toPrecision(10)).toString();
        }
        
        return formatted;
    }
    
    /**
     * Update both display lines
     */
    updateDisplay() {
        this.expressionDisplay.textContent = this.expression || '0';
        this.resultDisplay.textContent = this.formatNumber(this.currentInput);
    }
    
    /**
     * Handle keyboard input
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyboardInput(e) {
        // Prevent default behavior for calculator keys
        if (this.isCalculatorKey(e.key)) {
            e.preventDefault();
            
            // Find and trigger the corresponding button
            this.triggerButtonForKey(e.key);
            
            // Add visual feedback to the pressed key
            const button = this.findButtonForKey(e.key);
            if (button) {
                this.addRippleEffect(button);
            }
        }
    }
    
    /**
     * Check if key is a calculator key
     * @param {string} key - Keyboard key
     * @returns {boolean} - True if key is a calculator key
     */
    isCalculatorKey(key) {
        const calculatorKeys = [
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
            '.', '+', '-', '*', '/', '%',
            'Enter', '=', 'Escape', 'Delete', 'Backspace'
        ];
        return calculatorKeys.includes(key);
    }
    
    /**
     * Find button element for a keyboard key
     * @param {string} key - Keyboard key
     * @returns {HTMLElement|null} - Corresponding button element
     */
    findButtonForKey(key) {
        const keyMap = {
            '0': '[data-number="0"]',
            '1': '[data-number="1"]',
            '2': '[data-number="2"]',
            '3': '[data-number="3"]',
            '4': '[data-number="4"]',
            '5': '[data-number="5"]',
            '6': '[data-number="6"]',
            '7': '[data-number="7"]',
            '8': '[data-number="8"]',
            '9': '[data-number="9"]',
            '.': '[data-action="decimal"]',
            '+': '[data-action="add"]',
            '-': '[data-action="subtract"]',
            '*': '[data-action="multiply"]',
            '/': '[data-action="divide"]',
            '%': '[data-action="modulo"]',
            'Enter': '[data-action="equals"]',
            '=': '[data-action="equals"]',
            'Escape': '[data-action="clear"]',
            'Delete': '[data-action="clear"]',
            'Backspace': '[data-action="delete"]'
        };
        
        const selector = keyMap[key];
        return selector ? document.querySelector(selector) : null;
    }
    
    /**
     * Trigger calculator function for a keyboard key
     * @param {string} key - Keyboard key
     */
    triggerButtonForKey(key) {
        switch (key) {
            case '0': case '1': case '2': case '3': case '4':
            case '5': case '6': case '7': case '8': case '9':
                this.handleNumberInput(key);
                break;
            case '.':
                this.handleDecimalInput();
                break;
            case '+':
                this.handleOperator('add');
                break;
            case '-':
                this.handleOperator('subtract');
                break;
            case '*':
                this.handleOperator('multiply');
                break;
            case '/':
                this.handleOperator('divide');
                break;
            case '%':
                this.handleOperator('modulo');
                break;
            case 'Enter': case '=':
                this.calculateResult();
                break;
            case 'Escape': case 'Delete':
                this.clearAll();
                break;
            case 'Backspace':
                this.deleteLastCharacter();
                break;
        }
    }
    
    /**
     * Add ripple effect to a button
     * @param {HTMLElement} button - Button element
     */
    addRippleEffect(button) {
        button.classList.remove('ripple');
        
        // Trigger reflow to restart animation
        void button.offsetWidth;
        
        button.classList.add('ripple');
        
        // Remove ripple class after animation completes
        setTimeout(() => {
            button.classList.remove('ripple');
        }, 600);
    }}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Calculator();
});