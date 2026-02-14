const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

class CodeExecutor {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  async executeCode(code, language, testcases, stopOnFailure = false) {
    const results = [];
    let passed = 0;
    let totalExecTime = 0;
    let maxMemory = 0;

    for (let i = 0; i < testcases.length; i++) {
      const testcase = testcases[i];
      try {
        const result = await this.runSingleTest(code, language, testcase.input);
        
        const output = result.output.trim();
        const expectedOutput = testcase.output.trim();
        const isCorrect = output === expectedOutput;

        if (isCorrect) passed++;

        results.push({
          input: testcase.input,
          expectedOutput: expectedOutput,
          actualOutput: output,
          passed: isCorrect,
          execTime: result.execTime,
          memory: result.memory,
          error: result.error,
        });

        totalExecTime += result.execTime;
        maxMemory = Math.max(maxMemory, result.memory);

        // Stop on first failure if stopOnFailure is true (for submissions)
        if (stopOnFailure && !isCorrect) {
          break;
        }
      } catch (error) {
        results.push({
          input: testcase.input,
          expectedOutput: testcase.output,
          actualOutput: '',
          passed: false,
          execTime: 0,
          memory: 0,
          error: error.message,
        });

        // Stop on error if stopOnFailure is true
        if (stopOnFailure) {
          break;
        }
      }
    }

    const timeComplexity = this.inferTimeComplexity(code, language);

    return {
      passed: passed === testcases.length,
      testsPassed: passed,
      testsTotal: testcases.length,
      execTime: totalExecTime / testcases.length, // Average execution time
      memory: maxMemory,
      timeComplexity,
      results,
    };
  }

  async runSingleTest(code, language, input) {
    const startTime = Date.now();
    const filename = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const inputFile = path.join(this.tempDir, `${filename}_input.txt`);
    
    let command = '';
    let filepath = '';

    try {
      // Write input to a temporary file
      await fs.writeFile(inputFile, input);

      switch (language.toLowerCase()) {
        case 'python':
          filepath = path.join(this.tempDir, `${filename}.py`);
          await fs.writeFile(filepath, code);
          command = `python "${filepath}" < "${inputFile}"`;
          break;

        case 'javascript':
        case 'nodejs':
          filepath = path.join(this.tempDir, `${filename}.js`);
          await fs.writeFile(filepath, code);
          command = `node "${filepath}" < "${inputFile}"`;
          break;

        case 'cpp':
        case 'c++':
          filepath = path.join(this.tempDir, `${filename}.cpp`);
          const exePath = path.join(this.tempDir, `${filename}.exe`);
          await fs.writeFile(filepath, code);
          await execAsync(`g++ "${filepath}" -o "${exePath}"`, { timeout: 5000 });
          command = `"${exePath}" < "${inputFile}"`;
          break;

        case 'c':
          filepath = path.join(this.tempDir, `${filename}.c`);
          const cExePath = path.join(this.tempDir, `${filename}.exe`);
          await fs.writeFile(filepath, code);
          await execAsync(`gcc "${filepath}" -o "${cExePath}"`, { timeout: 5000 });
          command = `"${cExePath}" < "${inputFile}"`;
          break;

        case 'java':
          // Check if Java is available
          try {
            await execAsync('javac -version', { timeout: 2000 });
          } catch (error) {
            throw new Error('Java compiler (javac) is not installed on the server. Please use Python, C++, C, or JavaScript instead.');
          }
          
          // Extract class name from code or use default
          const className = this.extractJavaClassName(code) || 'Main';
          // Java filename MUST match the public class name
          filepath = path.join(this.tempDir, `${className}.java`);
          const javaCode = code.includes('public class') ? code : `public class ${className} { ${code} }`;
          await fs.writeFile(filepath, javaCode);
          await execAsync(`javac "${filepath}"`, { timeout: 5000 });
          command = `java -cp "${this.tempDir}" ${className} < "${inputFile}"`;
          break;

        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      const { stdout, stderr } = await execAsync(command, {
        timeout: 5000,
        maxBuffer: 1024 * 1024,
      });

      const execTime = Date.now() - startTime;

      // Clean up
      await this.cleanup(filepath, language, filename);
      await fs.unlink(inputFile).catch(() => {});

      return {
        output: stdout || stderr || '',
        execTime,
        memory: 0, // Memory tracking requires platform-specific tools
        error: null,
      };
    } catch (error) {
      await this.cleanup(filepath, language, filename);
      const simplifiedError = this.simplifyError(error.message || error.stderr || 'Execution failed', language);
      throw new Error(simplifiedError);
    }
  }

  simplifyError(errorMessage, language) {
    // Simplify error messages to be more user-friendly
    const lines = errorMessage.split('\n');
    
    // Python errors
    if (language === 'python') {
      // Find the last line which usually contains the error type
      const errorLine = lines[lines.length - 1] || lines[lines.length - 2];
      
      // Extract line number from traceback
      const lineMatch = errorMessage.match(/line (\d+)/);
      const lineNum = lineMatch ? ` (line ${lineMatch[1]})` : '';
      
      // Common Python errors
      if (errorLine.includes('NameError')) {
        const nameMatch = errorLine.match(/name '(.+?)' is not defined/);
        return nameMatch ? `NameError: '${nameMatch[1]}' is not defined${lineNum}` : errorLine;
      }
      if (errorLine.includes('SyntaxError')) {
        return `SyntaxError: Invalid syntax${lineNum}`;
      }
      if (errorLine.includes('IndentationError')) {
        return `IndentationError: Check your indentation${lineNum}`;
      }
      if (errorLine.includes('TypeError')) {
        return errorLine.replace(/^.*TypeError: /, 'TypeError: ');
      }
      if (errorLine.includes('ValueError')) {
        return errorLine.replace(/^.*ValueError: /, 'ValueError: ');
      }
      if (errorLine.includes('IndexError')) {
        return `IndexError: List index out of range${lineNum}`;
      }
      if (errorLine.includes('KeyError')) {
        return errorLine.replace(/^.*KeyError: /, 'KeyError: ');
      }
      if (errorLine.includes('AttributeError')) {
        return errorLine.replace(/^.*AttributeError: /, 'AttributeError: ');
      }
      if (errorLine.includes('ZeroDivisionError')) {
        return `ZeroDivisionError: Division by zero${lineNum}`;
      }
      
      return errorLine || 'Runtime error';
    }
    
    // JavaScript errors
    if (language === 'javascript' || language === 'nodejs') {
      for (const line of lines) {
        if (line.includes('ReferenceError') || line.includes('TypeError') || 
            line.includes('SyntaxError') || line.includes('RangeError')) {
          return line.trim();
        }
      }
    }
    
    // C/C++ errors
    if (language === 'cpp' || language === 'c++' || language === 'c') {
      // Extract compilation errors and clean them
      const errorLines = lines.filter(line => 
        line.includes('error:') || line.includes('warning:')
      );
      
      if (errorLines.length > 0) {
        const cleanedErrors = errorLines.slice(0, 3).map((line, idx) => {
          // Extract line number and error message
          // Format: /path/file.c:5:10: error: message
          const match = line.match(/:(\d+):(\d+):\s*(error|warning):\s*(.+)/);
          if (match) {
            const [, lineNum, , errorType, message] = match;
            return `• Line ${lineNum}: ${message}`;
          }
          // Fallback: just remove file paths
          return '• ' + line.replace(/\/opt\/render\/project\/src\/backend\/temp\/[^\s:]+:\s*/, '')
                     .replace(/temp_\d+_[a-z0-9]+\.(c|cpp):\s*/, '');
        });
        return cleanedErrors.join('\n\n');
      }
      
      // Runtime errors
      if (errorMessage.includes('Segmentation fault')) {
        return 'Runtime Error: Segmentation fault (possible array out of bounds or null pointer)';
      }
    }
    
    // Java errors
    if (language === 'java') {
      // Clean Java compilation errors
      const cleanedErrors = [];
      for (const line of lines) {
        if (line.includes('error:')) {
          // Format: Main.java:5: error: message
          const match = line.match(/Main\.java:(\d+):\s*error:\s*(.+)/);
          if (match) {
            const [, lineNum, message] = match;
            cleanedErrors.push(`• Line ${lineNum}: ${message}`);
          } else {
            // Fallback: just show the error without file path
            cleanedErrors.push('• ' + line.replace(/^.*Main\.java:\s*/, '').trim());
          }
        }
      }
      
      if (cleanedErrors.length > 0) {
        return cleanedErrors.slice(0, 3).join('\n\n');
      }
      
      // Runtime errors
      if (errorMessage.includes('cannot find symbol')) {
        return 'Compilation Error: Variable or method not found';
      }
      if (errorMessage.includes('NullPointerException')) {
        return 'Runtime Error: NullPointerException';
      }
      if (errorMessage.includes('ArrayIndexOutOfBoundsException')) {
        return 'Runtime Error: Array index out of bounds';
      }
    }
    
    // Default: return first meaningful line or the full message if short
    if (errorMessage.length < 100) {
      return errorMessage;
    }
    
    return lines.find(line => line.trim().length > 0) || 'Execution error';
  }

  escapeInput(input) {
    // For Windows, use backtick-n for newlines in PowerShell
    // Replace actual newlines with `n for PowerShell
    return input.replace(/"/g, '""');
  }

  extractJavaClassName(code) {
    const match = code.match(/public\s+class\s+(\w+)/);
    return match ? match[1] : null;
  }

  async cleanup(filepath, language, filename) {
    try {
      if (filepath) await fs.unlink(filepath).catch(() => {});
      
      if (language === 'cpp' || language === 'c++' || language === 'c') {
        const exePath = path.join(this.tempDir, `${filename}.exe`);
        await fs.unlink(exePath).catch(() => {});
      }
      
      if (language === 'java') {
        // Extract class name from filepath for cleanup
        const className = path.basename(filepath, '.java');
        const classPath = path.join(this.tempDir, `${className}.class`);
        await fs.unlink(classPath).catch(() => {});
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  inferTimeComplexity(code, language) {
    // Simple heuristic-based complexity detection
    const loopPatterns = {
      nested3: /for[\s\S]*for[\s\S]*for/g,
      nested2: /for[\s\S]*for/g,
      single: /for|while/g,
    };

    if (code.match(loopPatterns.nested3)) {
      return 'O(n³)';
    } else if (code.match(loopPatterns.nested2)) {
      // Check for common patterns
      if (code.includes('sort') || code.includes('Sort')) {
        return 'O(n²log n)';
      }
      return 'O(n²)';
    } else if (code.match(loopPatterns.single)) {
      if (code.includes('sort') || code.includes('Sort')) {
        return 'O(n log n)';
      }
      return 'O(n)';
    } else if (code.includes('sort') || code.includes('Sort')) {
      return 'O(n log n)';
    }

    return 'O(1)';
  }
}

module.exports = new CodeExecutor();
