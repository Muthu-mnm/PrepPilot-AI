import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  Send, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database, 
  FileCode,
  AlertCircle
} from 'lucide-react';
import { CodingQuestion, CodeExecutionResponse } from '../types';
import { api } from '../services/api';

export const CodingWorkspace: React.FC = () => {
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<CodingQuestion | null>(null);
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<'sql' | 'python'>('sql');
  const [executionResult, setExecutionResult] = useState<CodeExecutionResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const list = await api.getCodingQuestions();
        setQuestions(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedQuestion(first);
          setCode(first.starter_code);
          setLanguage(first.language);
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const handleSelectQuestion = (q: CodingQuestion) => {
    setSelectedQuestion(q);
    setCode(q.starter_code);
    setLanguage(q.language);
    setExecutionResult(null);
  };

  const handleRun = async () => {
    if (!selectedQuestion) return;
    setIsRunning(true);
    setExecutionResult(null);
    try {
      const res = await api.runCode({
        question_id: selectedQuestion.id,
        language: language,
        code: code
      });
      setExecutionResult(res);
    } catch (err: any) {
      alert(`Execution Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedQuestion) return;
    setIsSubmitting(true);
    setExecutionResult(null);
    try {
      const res = await api.submitCode({
        question_id: selectedQuestion.id,
        language: language,
        code: code
      });
      setExecutionResult(res);
    } catch (err: any) {
      alert(`Submission Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (selectedQuestion) {
      setCode(selectedQuestion.starter_code);
      setExecutionResult(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading coding workspace...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            className="form-control"
            style={{ width: '260px', fontWeight: 600 }}
            value={selectedQuestion?.id || ''}
            onChange={(e) => {
              const q = questions.find((x) => x.id === e.target.value);
              if (q) handleSelectQuestion(q);
            }}
          >
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                [{q.language.toUpperCase()}] {q.title} ({q.difficulty})
              </option>
            ))}
          </select>

          <span className={`badge ${selectedQuestion?.difficulty === 'easy' ? 'badge-verified' : 'badge-candidate'}`}>
            {selectedQuestion?.difficulty.toUpperCase()}
          </span>

          <span className="badge badge-official">
            {language === 'sql' ? 'SQL Engine' : 'Python 3.12'}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleReset} className="btn btn-secondary btn-sm" title="Reset starter code">
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
          <button onClick={handleRun} disabled={isRunning || isSubmitting} className="btn btn-secondary btn-sm">
            <Play size={15} />
            <span>{isRunning ? 'Running...' : 'Run Code'}</span>
          </button>
          <button onClick={handleSubmit} disabled={isRunning || isSubmitting} className="btn btn-primary btn-sm">
            <Send size={15} />
            <span>{isSubmitting ? 'Evaluating...' : 'Submit Solution'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid: Problem Panel & Editor Panel */}
      <div className="coding-workspace-grid">
        {/* Left: Problem Panel */}
        <div className="problem-panel">
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {selectedQuestion?.title}
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '16px' }}>
            Topic: {selectedQuestion?.topic}
          </div>

          <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
            {selectedQuestion?.problem_statement}
          </div>

          {selectedQuestion?.schema_explanation && (
            <div style={{ marginTop: '20px', padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                <Database size={16} color="var(--accent-primary)" />
                <span>Deterministic Schema Specification</span>
              </div>
              <code style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                {selectedQuestion.schema_explanation}
              </code>
            </div>
          )}

          {/* Sample Inputs */}
          {selectedQuestion?.sample_inputs_and_outputs && selectedQuestion.sample_inputs_and_outputs.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '8px' }}>Sample Example:</h4>
              {selectedQuestion.sample_inputs_and_outputs.map((sample, idx) => (
                <div key={idx} style={{ padding: '10px 14px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.82rem' }}>
                  <div><strong>Input:</strong> <code>{sample.input}</code></div>
                  <div style={{ marginTop: '4px' }}><strong>Expected:</strong> <code>{sample.output}</code></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Editor Panel & Results */}
        <div className="editor-panel">
          <div className="editor-wrapper">
            <Editor
              height="100%"
              language={language === 'sql' ? 'sql' : 'python'}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'JetBrains Mono, monospace',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
              }}
            />
          </div>

          {/* Results Drawer */}
          {executionResult && (
            <div className="results-drawer">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`badge ${executionResult.status === 'passed' ? 'badge-verified' : 'badge-candidate'}`} style={{ fontSize: '0.85rem' }}>
                    {executionResult.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {executionResult.passed_count} / {executionResult.total_count} Tests Passed
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <Clock size={14} />
                  <span>{executionResult.execution_time_ms} ms</span>
                </div>
              </div>

              {/* Compilation / Runtime Error */}
              {executionResult.compilation_or_runtime_error && (
                <div style={{ padding: '12px', background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 'var(--radius-md)', color: 'var(--error)', fontSize: '0.85rem', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>Execution Error:</div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                    {executionResult.compilation_or_runtime_error}
                  </pre>
                </div>
              )}

              {/* Individual Test Cases Matrix */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {executionResult.results.map((r) => (
                  <div 
                    key={r.test_id} 
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: r.passed ? 'var(--success-bg)' : 'var(--error-bg)',
                      border: `1px solid ${r.passed ? 'var(--success-border)' : 'var(--error-border)'}`,
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        {r.passed ? <CheckCircle size={15} color="var(--success)" /> : <XCircle size={15} color="var(--error)" />}
                        <span>{r.name}</span>
                        {r.is_hidden && <span className="badge badge-candidate" style={{ fontSize: '0.65rem' }}>Hidden Test</span>}
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>{r.execution_time_ms}ms</span>
                    </div>

                    {!r.passed && r.error_message && (
                      <div style={{ marginTop: '6px', color: 'var(--error)', fontWeight: 500 }}>
                        {r.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* AI Algorithmic Diagnostic Tutor Explanation */}
              {executionResult.ai_failure_explanation && (
                <div style={{ marginTop: '14px', padding: '14px', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.88rem', marginBottom: '6px' }}>
                    <FileCode size={16} />
                    <span>Diagnostic Feedback & Code Analysis</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {executionResult.ai_failure_explanation}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
