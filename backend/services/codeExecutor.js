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
      throw new Error(error.message || 'Execution failed');
    }
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
