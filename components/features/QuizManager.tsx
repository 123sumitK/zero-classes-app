
import React, { useState, useEffect } from 'react';
import { User, UserRole, Course, Quiz, Question, QuizResult } from '../../types';
import { storageService } from '../../services/storage';
import { Button, Input, Card, Select, AuditTag } from '../ui/Shared';
import { Plus, Trash2, Clock, CheckCircle, XCircle, Play, Award, ChevronDown, ChevronUp, Flag, ArrowLeft, ArrowRight, Grid } from 'lucide-react';

interface QuizManagerProps {
  user: User;
  courses: Course[];
  courseIdFilter?: string; // Optional: only show quizzes for this course
  showToast: (m: string, t: any) => void;
}

export const QuizManager: React.FC<QuizManagerProps> = ({ user, courses, courseIdFilter, showToast }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  
  // Instructor Create
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(courseIdFilter || '');
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState(15);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Student Take
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // qIndex -> optionIndex
  const [markedForReview, setMarkedForReview] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [showPalette, setShowPalette] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, [courses]);

  const fetchQuizzes = async () => {
    const data = await storageService.getQuizzes();
    // If filter provided (Student View), filter them. If Instructor, show all but we will categorize them in UI.
    if (courseIdFilter) {
      setQuizzes(data.filter(q => q.courseId === courseIdFilter));
    } else {
      setQuizzes(data);
    }
  };

  // --- INSTRUCTOR LOGIC ---
  const handleAddQuestion = () => {
    setQuestions([...questions, {
      id: Math.random().toString(36).substring(7),
      text: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanation: ''
    }]);
  };

  const updateQuestion = (idx: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, optIdx: number, val: string) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = val;
    setQuestions(updated);
  };

  const handleSaveQuiz = async () => {
    if (!selectedCourseId || !newQuizTitle || questions.length === 0) {
      return showToast('Please fill all fields and add questions', 'error');
    }
    await storageService.addQuiz({
      courseId: selectedCourseId,
      title: newQuizTitle,
      timeLimit,
      questions
    }, user.name);
    showToast('Quiz created successfully', 'success');
    setCreatingQuiz(false);
    setNewQuizTitle(''); setQuestions([]);
    fetchQuizzes();
  };

  const handleDeleteQuiz = async (id: string) => {
    if (window.confirm('Delete this quiz?')) {
      await storageService.deleteQuiz(id);
      fetchQuizzes();
    }
  };

  // --- STUDENT LOGIC ---
  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQIndex(0);
    setAnswers({});
    setMarkedForReview([]);
    setTimeLeft(quiz.timeLimit * 60);
    setQuizResult(null);
  };

  useEffect(() => {
    if (activeQuiz && timeLeft > 0 && !quizResult) {
      const timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
      return () => clearInterval(timer);
    } else if (activeQuiz && timeLeft === 0 && !quizResult) {
      submitQuiz();
    }
  }, [activeQuiz, timeLeft, quizResult]);

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    let score = 0;
    activeQuiz.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) score++;
    });

    const result: Partial<QuizResult> = {
      quizId: activeQuiz.id,
      studentId: user.id,
      score,
      total: activeQuiz.questions.length,
    };

    await storageService.submitQuizResult(result);
    // @ts-ignore
    setQuizResult(result);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const toggleReview = (idx: number) => {
    if (markedForReview.includes(idx)) {
      setMarkedForReview(markedForReview.filter(i => i !== idx));
    } else {
      setMarkedForReview([...markedForReview, idx]);
    }
  };

  // --- RENDER INSTRUCTOR VIEW ---
  if (user.role === UserRole.INSTRUCTOR || user.role === UserRole.ADMIN) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Quiz Management</h3>
          <Button onClick={() => setCreatingQuiz(!creatingQuiz)}>
            {creatingQuiz ? 'Cancel' : 'Create New Quiz'}
          </Button>
        </div>

        {creatingQuiz && (
          <Card className="border-2 border-primary-100">
            <div className="space-y-4">
              <Select 
                label="Select Course"
                options={courses.map(c => ({ value: c.id, label: c.title }))}
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                disabled={!!courseIdFilter}
              />
              <div className="flex gap-4">
                <Input label="Quiz Title" value={newQuizTitle} onChange={e => setNewQuizTitle(e.target.value)} className="flex-1" />
                <Input label="Time Limit (mins)" type="number" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className="w-32" />
              </div>
              
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between mb-2">
                      <span className="font-bold">Question {idx + 1}</span>
                      <button onClick={() => {
                        const updated = questions.filter((_, i) => i !== idx);
                        setQuestions(updated);
                      }} className="text-red-500"><Trash2 size={16} /></button>
                    </div>
                    <Input placeholder="Question text" value={q.text} onChange={e => updateQuestion(idx, 'text', e.target.value)} />
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                           <input 
                             type="radio" 
                             name={`q-${idx}`} 
                             checked={q.correctIndex === oIdx} 
                             onChange={() => updateQuestion(idx, 'correctIndex', oIdx)}
                           />
                           <Input placeholder={`Option ${oIdx + 1}`} value={opt} onChange={e => updateOption(idx, oIdx, e.target.value)} className="mb-0" />
                        </div>
                      ))}
                    </div>
                    <Input placeholder="Explanation (Optional)" value={q.explanation} onChange={e => updateQuestion(idx, 'explanation', e.target.value)} className="mb-0" />
                  </div>
                ))}
                <Button variant="secondary" onClick={handleAddQuestion} className="w-full border-dashed border-2 border-gray-300 bg-transparent text-gray-600 hover:bg-gray-50">
                  <Plus size={16} className="mr-2 inline" /> Add Question
                </Button>
              </div>
              <Button onClick={handleSaveQuiz} className="w-full">Save Quiz</Button>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {/* Group Quizzes by Course */}
          {courses.map(course => {
             const courseQuizzes = quizzes.filter(q => q.courseId === course.id);
             if (courseQuizzes.length === 0) return null;
             const isExpanded = expandedCourseId === course.id;

             return (
               <div key={course.id} className="border rounded-lg bg-white overflow-hidden">
                 <button 
                   onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                   className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
                 >
                    <span className="font-bold text-gray-700">{course.title} ({courseQuizzes.length} Quizzes)</span>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                 </button>
                 
                 {isExpanded && (
                   <div className="p-4 space-y-2">
                     {courseQuizzes.map(q => (
                       <div key={q.id} className="flex justify-between items-center p-3 border rounded hover:shadow-sm">
                         <div>
                           <h5 className="font-semibold">{q.title}</h5>
                           <p className="text-xs text-gray-500">{q.questions.length} Qs • {q.timeLimit} mins</p>
                           <AuditTag createdBy={q.createdBy} lastEditedBy={q.lastEditedBy} updatedAt={q.updatedAt} userRole={user.role} />
                         </div>
                         <Button variant="danger" size="sm" onClick={() => handleDeleteQuiz(q.id)}>
                           <Trash2 size={14} />
                         </Button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             );
          })}
        </div>
      </div>
    );
  }

  // --- STUDENT VIEW ---

  // FULL SCREEN TAKING MODE
  if (activeQuiz && !quizResult) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{activeQuiz.title}</h2>
          <div className={`flex items-center gap-2 font-mono font-bold text-lg ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
            <Clock size={20} /> {formatTime(timeLeft)}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Question Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-12">
             <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                  <span className="text-gray-500 font-medium">Question {currentQIndex + 1} / {activeQuiz.questions.length}</span>
                  <button 
                    onClick={() => toggleReview(currentQIndex)}
                    className={`flex items-center gap-1 text-sm font-medium ${markedForReview.includes(currentQIndex) ? 'text-yellow-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Flag size={16} fill={markedForReview.includes(currentQIndex) ? "currentColor" : "none"} />
                    {markedForReview.includes(currentQIndex) ? 'Marked for Review' : 'Mark for Review'}
                  </button>
                </div>

                <h3 className="text-xl font-medium text-gray-900 mb-6 leading-relaxed">
                  {activeQuiz.questions[currentQIndex].text}
                </h3>

                <div className="space-y-3">
                  {activeQuiz.questions[currentQIndex].options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAnswers({...answers, [currentQIndex]: idx})}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                        answers[currentQIndex] === idx 
                          ? 'bg-primary-50 border-primary-500 text-primary-900' 
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${answers[currentQIndex] === idx ? 'border-primary-500 bg-primary-500' : 'border-gray-400'}`}>
                         {answers[currentQIndex] === idx && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="mt-8 flex justify-between pt-6 border-t">
                  <Button 
                    variant="secondary" 
                    onClick={() => setCurrentQIndex(p => p - 1)}
                    disabled={currentQIndex === 0}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft size={16} /> Previous
                  </Button>
                  
                  <div className="flex gap-2">
                     {/* Palette Toggle Mobile */}
                     <button 
                        className="md:hidden p-2 bg-gray-100 rounded"
                        onClick={() => setShowPalette(!showPalette)}
                     >
                       <Grid size={20} />
                     </button>
                     
                     {currentQIndex === activeQuiz.questions.length - 1 ? (
                       <Button onClick={submitQuiz} className="bg-green-600 hover:bg-green-700">Submit Test</Button>
                     ) : (
                       <Button onClick={() => setCurrentQIndex(p => p + 1)} className="flex items-center gap-2">
                         Next <ArrowRight size={16} />
                       </Button>
                     )}
                  </div>
                </div>
             </div>
          </div>

          {/* Question Palette Sidebar */}
          <div className={`w-72 bg-gray-50 border-l p-6 overflow-y-auto ${showPalette ? 'block absolute right-0 inset-y-0 z-40 shadow-xl' : 'hidden md:block'}`}>
             <h4 className="font-bold text-gray-700 mb-4">Question Palette</h4>
             <div className="grid grid-cols-4 gap-2">
               {activeQuiz.questions.map((_, idx) => {
                 let statusClass = 'bg-white border-gray-300 text-gray-600'; // Unvisited
                 if (currentQIndex === idx) statusClass = 'ring-2 ring-primary-500 border-primary-500 text-primary-700'; // Current
                 else if (markedForReview.includes(idx)) statusClass = 'bg-yellow-100 border-yellow-400 text-yellow-700'; // Review
                 else if (answers[idx] !== undefined) statusClass = 'bg-green-100 border-green-400 text-green-700'; // Answered

                 return (
                   <button
                     key={idx}
                     onClick={() => setCurrentQIndex(idx)}
                     className={`h-10 w-10 rounded flex items-center justify-center text-sm font-medium border ${statusClass}`}
                   >
                     {idx + 1}
                     {markedForReview.includes(idx) && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full" />}
                   </button>
                 );
               })}
             </div>
             
             <div className="mt-8 space-y-2 text-xs text-gray-500">
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 border border-green-400 rounded" /> Answered</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-100 border border-yellow-400 rounded" /> Marked for Review</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-gray-300 rounded" /> Not Visited</div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // RESULT VIEW
  if (activeQuiz && quizResult) {
     return (
       <Card className="text-center py-12 animate-in fade-in slide-in-from-bottom-4">
         <Award className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
         <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Completed!</h2>
         <p className="text-xl text-gray-600 mb-8">You scored <span className="font-bold text-primary-600 text-2xl">{quizResult.score} / {quizResult.total}</span></p>
         
         <div className="text-left max-w-3xl mx-auto space-y-6 mb-8">
           {activeQuiz.questions.map((q, idx) => (
             <div key={idx} className={`p-5 rounded-lg border-l-4 shadow-sm ${answers[idx] === q.correctIndex ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                <div className="flex justify-between mb-2">
                  <p className="font-bold text-gray-800">{idx + 1}. {q.text}</p>
                  {answers[idx] === q.correctIndex ? <CheckCircle className="text-green-600" size={20} /> : <XCircle className="text-red-600" size={20} />}
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs uppercase tracking-wide">Your Answer</span>
                    <span className={`font-medium ${answers[idx] === q.correctIndex ? 'text-green-700' : 'text-red-700'}`}>
                      {q.options[answers[idx]] || 'Skipped'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs uppercase tracking-wide">Correct Answer</span>
                    <span className="font-medium text-gray-800">{q.options[q.correctIndex]}</span>
                  </div>
                </div>
                {q.explanation && (
                  <div className="mt-3 pt-3 border-t border-gray-200/50">
                    <p className="text-xs text-gray-600 italic flex gap-2">
                      <span className="font-bold not-italic">Explanation:</span> {q.explanation}
                    </p>
                  </div>
                )}
             </div>
           ))}
         </div>
         
         <Button onClick={() => setActiveQuiz(null)} size="lg">Back to Dashboard</Button>
       </Card>
     );
  }

  // DEFAULT LIST VIEW (Student)
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {quizzes.length === 0 && <p className="text-gray-500 col-span-2 text-center py-8 italic">No quizzes available for this course yet.</p>}
      {quizzes.map(q => (
        <Card key={q.id} className="flex justify-between items-center hover:shadow-lg transition-all border-l-4 border-primary-400">
          <div>
            <h4 className="font-bold text-gray-800">{q.title}</h4>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <Clock size={14} /> {q.timeLimit} Mins • {q.questions.length} Questions
            </p>
          </div>
          <Button onClick={() => startQuiz(q)}>
            <Play size={16} className="mr-2 inline" /> Start
          </Button>
        </Card>
      ))}
    </div>
  );
};
