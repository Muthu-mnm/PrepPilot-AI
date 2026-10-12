import React, { useState } from 'react';
import { 
  Sparkles, 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  HelpCircle, 
  BookOpen,
  Code2
} from 'lucide-react';

export const MentorView: React.FC = () => {
  const [activeConcept, setActiveConcept] = useState<'joins' | 'twosum'>('joins');
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const concepts = {
    joins: {
      title: 'SQL LEFT JOIN vs. INNER JOIN on Unmatched Records',
      misconception: 'Assuming LEFT JOIN and INNER JOIN produce the same output when filtering on foreign key IDs.',
      affirmation: 'You correctly identified that foreign key relations join the Customers and Orders tables.',
      analogy: 'Imagine a roll-call checklist of students in a classroom (Customers). If a student has not turned in homework (Orders), INNER JOIN kicks them off the attendance sheet completely, while LEFT JOIN keeps their name on the list with an empty homework slot (NULL).',
      comparison: {
        incorrect: `SELECT c.name FROM Customers c
INNER JOIN Orders o ON c.id = o.customerId
WHERE o.customerId IS NULL;
-- FAILS: INNER JOIN already stripped out unmatched rows, returning an empty result!`,
        correct: `SELECT c.name FROM Customers c
LEFT JOIN Orders o ON c.id = o.customerId
WHERE o.customerId IS NULL;
-- SUCCEEDS: Preserves unmatched customers with NULL order records!`
      },
      quiz: {
        question: 'Suppose Table A has 3 rows (IDs: 1, 2, 3) and Table B has 1 row (ID: 1). How many rows does "SELECT * FROM A LEFT JOIN B ON A.id = B.id" produce?',
        options: ['1 row', '2 rows', '3 rows', '4 rows'],
        correctIndex: 2,
        explanation: 'A LEFT JOIN guarantees that every row from the left table (Table A) appears in the output at least once. Since Table A has 3 rows, all 3 rows are preserved.'
      }
    },
    twosum: {
      title: 'Two Sum: Hash Map O(n) vs Nested Loops O(n²)',
      misconception: 'Defaulting to brute-force nested loops when searching for matching complement pairs in arrays.',
      affirmation: 'You understood the mathematical relationship that complement = target - current_element.',
      analogy: 'Imagine checking into a coat-check room. Instead of searching every single jacket in the closet one by one (O(n²)), you write down a ticket slip in a catalog (Hash Map) and look up whether your ticket number is already registered in instantaneous O(1) time.',
      comparison: {
        incorrect: `for i in range(len(nums)):
    for j in range(i + 1, len(nums)):
        if nums[i] + nums[j] == target:
            return [i, j]
# FAILS ON LARGE INPUTS: O(n²) time limit exceeded!`,
        correct: `seen = {}
for i, num in enumerate(nums):
    diff = target - num
    if diff in seen:
        return [seen[diff], i]
    seen[num] = i
# OPTIMAL: O(n) time with O(n) space!`
      },
      quiz: {
        question: 'Why do we store the number as the key and its index as the value in the hash map?',
        options: [
          'Because numbers cannot be values in Python dictionaries',
          'Because checking "diff in seen" performs an O(1) key lookup, allowing instant retrieval of the complement index',
          'To sort the array in ascending order',
          'To prevent memory leaks'
        ],
        correctIndex: 1,
        explanation: 'Dictionary key membership lookups in Python are hash-based O(1) operations, which allows instantaneous detection of whether the complementary value was previously visited.'
      }
    }
  };

  const curr = concepts[activeConcept];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Mistake-to-Mastery Mentor System
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          5-Step Structured Cognitive Pedagogy: Misconception Diagnosis → Intuitive Analogy → Contrast → Retest.
        </p>
      </div>

      {/* Concept Selector Tabs */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => { setActiveConcept('joins'); setQuizSubmitted(false); setSelectedQuizAnswer(null); }}
          className={`btn ${activeConcept === 'joins' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <span>SQL Joins & Unmatched NULLs</span>
        </button>
        <button 
          onClick={() => { setActiveConcept('twosum'); setQuizSubmitted(false); setSelectedQuizAnswer(null); }}
          className={`btn ${activeConcept === 'twosum' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <span>Two Sum Hash Maps & Time Complexity</span>
        </button>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="var(--accent-primary)" />
          <span>{curr.title}</span>
        </h2>

        {/* Step 1 & 2: Diagnosis & Affirmation */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ padding: '16px', background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--error)', fontSize: '0.88rem', marginBottom: '6px' }}>
              <XCircle size={16} />
              <span>Step 1: Diagnosed Misconception</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              {curr.misconception}
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--success)', fontSize: '0.88rem', marginBottom: '6px' }}>
              <CheckCircle2 size={16} />
              <span>Step 2: Acknowledged Correct Reasoning</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              {curr.affirmation}
            </div>
          </div>
        </div>

        {/* Step 3: Concrete Analogy */}
        <div style={{ padding: '18px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.9rem', marginBottom: '6px' }}>
            <Lightbulb size={18} />
            <span>Step 3: Intuitive Real-World Analogy</span>
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {curr.analogy}
          </div>
        </div>

        {/* Step 4: Side-by-Side Comparison */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>
            Step 4: Side-by-Side Architectural Contrast
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#1E1E1E', color: '#F87171', padding: '16px', borderRadius: 'var(--radius-md)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', overflowX: 'auto' }}>
              <div style={{ color: '#EF4444', fontWeight: 700, marginBottom: '8px' }}>❌ Incorrect Approach</div>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{curr.comparison.incorrect}</pre>
            </div>
            <div style={{ background: '#1E1E1E', color: '#4ADE80', padding: '16px', borderRadius: 'var(--radius-md)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', overflowX: 'auto' }}>
              <div style={{ color: '#22C55E', fontWeight: 700, marginBottom: '8px' }}>✓ Correct Optimal Approach</div>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{curr.comparison.correct}</pre>
            </div>
          </div>
        </div>

        {/* Step 5: Check for Understanding & Retest */}
        <div style={{ padding: '20px', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle size={18} />
            <span>Step 5: Independent Verification Quiz</span>
          </h4>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '16px', fontWeight: 600 }}>
            {curr.quiz.question}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {curr.quiz.options.map((opt, idx) => (
              <label 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${selectedQuizAnswer === idx ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                <input
                  type="radio"
                  name="quiz"
                  checked={selectedQuizAnswer === idx}
                  onChange={() => setSelectedQuizAnswer(idx)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setQuizSubmitted(true)}
              disabled={selectedQuizAnswer === null}
              className="btn btn-primary btn-sm"
            >
              <span>Verify Independent Understanding</span>
            </button>

            {quizSubmitted && (
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: selectedQuizAnswer === curr.quiz.correctIndex ? 'var(--success)' : 'var(--error)' }}>
                {selectedQuizAnswer === curr.quiz.correctIndex ? '✓ Correct! Independent mastery recorded.' : 'Incorrect. Review the analogy above.'}
              </span>
            )}
          </div>

          {quizSubmitted && (
            <div style={{ marginTop: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {curr.quiz.explanation}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
