import React, { useState } from 'react';
import { 
  BrainCircuit, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  History, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  Info,
  Calendar,
  Lock,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BSAS_QUESTIONS } from '../../data/seedData';
import { BSASAssessment } from '../../types/database';
import { BSASCooldownInfo } from '../../services/closetService';

interface BSASViewProps {
  assessments: BSASAssessment[];
  cooldownInfo: BSASCooldownInfo;
  onSubmitAssessment: (score: number, breakdown?: BSASAssessment['breakdown']) => Promise<void>;
}

export const BSASView: React.FC<BSASViewProps> = ({
  assessments,
  cooldownInfo,
  onSubmitAssessment
}) => {
  // Store responses for each question: 0 (Disagree) to 1 (Agree/Endorsed)
  // Total score is between 0 and 7.
  const [answers, setAnswers] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideCooldownForTesting, setOverrideCooldownForTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'survey' | 'history' | 'guidelines'>('survey');

  const latestAssessment = assessments[0];
  const canTakeSurvey = cooldownInfo.canTake || overrideCooldownForTesting;

  const currentScore = Object.values(answers).reduce((acc, val) => acc + val, 0);

  const handleToggleAnswer = (questionId: number, value: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const breakdown = {
        salience: answers[1] || 0,
        mood_modification: answers[2] || 0,
        conflict: answers[3] || 0,
        tolerance: answers[4] || 0,
        relapse: answers[5] || 0,
        withdrawal: answers[6] || 0,
        problems: answers[7] || 0
      };

      await onSubmitAssessment(currentScore, breakdown);
      
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
      setActiveTab('survey');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 30-Day Cooldown Notification Banner */}
      {!cooldownInfo.canTake && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  30-Day Clinical Cooldown Active
                </span>
                <span className="text-xs font-mono font-bold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">
                  {cooldownInfo.daysRemaining} days left
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5">
                The Bergen Shopping Addiction Scale requires a 30-day interval to measure meaningful behavioral shifts. Next retake due on: <strong>{new Date(cooldownInfo.retakeDueDate || '').toLocaleDateString()}</strong>.
              </p>
            </div>
          </div>

          {/* Testing bypass toggle */}
          <button
            type="button"
            onClick={() => setOverrideCooldownForTesting(!overrideCooldownForTesting)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-900 hover:bg-amber-100/50 transition cursor-pointer whitespace-nowrap self-end sm:self-auto"
          >
            {overrideCooldownForTesting ? 'Enforce 30-Day Lock' : 'Bypass Lock (Tester Mode)'}
          </button>
        </div>
      )}

      {/* When monthly retake is due alert */}
      {cooldownInfo.canTake && assessments.length > 0 && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
              Monthly Check-in Due!
            </span>
            <p className="text-xs text-emerald-800/90 mt-0.5">
              It has been over 30 days since your last assessment. Take 3 minutes to evaluate your wardrobe relationship and shopping impulse progress.
            </p>
          </div>
        </div>
      )}

      {/* Module Tabs Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-emerald-600" />
          <div>
            <h2 className="text-lg font-bold font-display text-slate-900">
              Bergen Shopping Addiction Scale (BSAS)
            </h2>
            <p className="text-xs text-slate-500">
              Validated clinical screener aligned with UN SDG 12 to reduce compulsive consumption
            </p>
          </div>
        </div>

        <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-100 text-xs font-medium">
          <button
            onClick={() => setActiveTab('survey')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'survey' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
            }`}
          >
            Assessment
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({assessments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('guidelines')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'guidelines' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guidance</span>
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      {activeTab === 'survey' && (
        <div className="space-y-6">
          
          {/* Latest Assessment Summary Card if exists */}
          {latestAssessment && (
            <div className={`p-5 rounded-2xl border ${
              latestAssessment.risk_level === 'Indicative'
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-emerald-50/70 border-emerald-200'
            } shadow-2xs`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                    latestAssessment.risk_level === 'Indicative'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {latestAssessment.score}/7
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Current Diagnostic Status:
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        latestAssessment.risk_level === 'Indicative'
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-emerald-200 text-emerald-900'
                      }`}>
                        {latestAssessment.risk_level} (Cutoff ≥ 4)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Evaluated on {new Date(latestAssessment.taken_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-600 font-medium block">
                    {latestAssessment.risk_level === 'Indicative'
                      ? 'Compulsive shopping behaviors indicated'
                      : 'Mindful consumption habits maintained'}
                  </span>
                </div>
              </div>

              {/* Actionable behavioral guidance */}
              <div className="pt-3 text-xs text-slate-700 leading-relaxed">
                {latestAssessment.risk_level === 'Indicative' ? (
                  <div className="space-y-1.5">
                    <p className="font-semibold text-amber-950">
                      Actionable Recovery Protocol (UN SDG 12):
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      <li><strong>Implement a 72-Hour Cooling Off Rule:</strong> Add impulse items to a saved bookmark folder rather than purchasing immediately.</li>
                      <li><strong>Focus on Wear Count Maximization:</strong> Aim to rotate garments with 0 wears in your virtual closet before considering any acquisition.</li>
                      <li><strong>Dopamine Substitution:</strong> Replace the browsing ritual with cataloging your existing clothes or styling new outfits in the Daily Log.</li>
                      <li><strong>Utilize Community Borrowing:</strong> Borrow items from friends in the Lending Board for special occasions instead of buying fast fashion.</li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="font-semibold text-emerald-950">
                      Mindful Consumption Maintenance:
                    </p>
                    <p className="text-slate-700">
                      Your responses reflect balanced wardrobe control. Continue logging your outfits daily to keep active utilization above 70% and reduce textile waste.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Questionnaire Form */}
          {canTakeSurvey ? (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
              
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 font-display">
                    Diagnostic Questionnaire (7 Core Addiction Criteria)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Answer honestly based on your experiences over the past 30 days.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Live Score Preview</span>
                  <span className={`text-lg font-bold font-mono ${currentScore >= 4 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {currentScore} / 7
                  </span>
                </div>
              </div>

              {/* Questions list */}
              <div className="space-y-4">
                {BSAS_QUESTIONS.map((q) => {
                  const isEndorsed = answers[q.id] === 1;
                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border transition ${
                        isEndorsed 
                          ? 'border-amber-300 bg-amber-50/30' 
                          : 'border-slate-200 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{q.title}</span>
                            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {q.dimension}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{q.description}</p>
                        </div>

                        {/* Endorsement buttons (0 = Disagree, 1 = Agree) */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleAnswer(q.id, 0)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                              !isEndorsed
                                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Disagree (0)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAnswer(q.id, 1)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                              isEndorsed
                                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Agree (1)
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Results will be logged into your clinical recovery timeline and calculate your risk interpretation.
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs shadow-md shadow-slate-900/20 transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Submit BSAS Assessment</span>
                </button>
              </div>

            </form>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 font-display">
                Questionnaire Locked by 30-Day Protocol
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                You took this assessment recently. In the meantime, focus on daily clothing logging and community borrowing to establish sustainable routines.
              </p>
              <button
                type="button"
                onClick={() => setOverrideCooldownForTesting(true)}
                className="mt-2 text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
              >
                Click here to unlock for demonstration testing
              </button>
            </div>
          )}

        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 font-display">
            Historical BSAS Screener Records
          </h3>
          <p className="text-xs text-slate-500">
            Logged according to the <code>BSAS_ASSESSMENT</code> database table specification.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Assessment ID</th>
                  <th className="py-2.5 px-3">Date Taken</th>
                  <th className="py-2.5 px-3">Score (0-7)</th>
                  <th className="py-2.5 px-3">Clinical Risk Level</th>
                  <th className="py-2.5 px-3">Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No clinical assessments logged yet. Take your first BSAS assessment in the "Diagnostic Screener" tab.
                    </td>
                  </tr>
                ) : (
                  assessments.map((a) => (
                    <tr key={a.assessment_id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono text-slate-500">#{a.assessment_id}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {new Date(a.taken_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-bold font-mono">
                        <span className={a.score >= 4 ? 'text-amber-600' : 'text-emerald-600'}>
                          {a.score} / 7
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          a.risk_level === 'Indicative'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {a.risk_level}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {a.score >= 4 ? 'Score ≥ 4: Compulsive shopping tendency' : 'Score < 4: Controlled mindful consumption'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Guidelines Tab */}
      {activeTab === 'guidelines' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="font-bold text-base text-slate-900 font-display">
              About the Bergen Shopping Addiction Scale (BSAS)
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Developed by clinical psychologists at the University of Bergen, the BSAS adapts the core addiction framework (Griffiths, 2005) specifically to modern consumerism and fast-fashion behaviors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800">Core Diagnostic Dimensions:</h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li><strong>Salience:</strong> Shopping dominates thoughts and behaviors.</li>
                <li><strong>Mood Modification:</strong> Buying apparel to self-soothe anxiety or sadness.</li>
                <li><strong>Conflict:</strong> Spending creates interpersonal or financial friction.</li>
                <li><strong>Tolerance:</strong> Requiring more hauls to experience emotional relief.</li>
                <li><strong>Relapse:</strong> Inability to maintain no-buy or low-buy commitments.</li>
                <li><strong>Withdrawal:</strong> Distress when spending is restricted.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
              <h4 className="font-bold text-emerald-900">Alignment with UN SDG 12:</h4>
              <p className="text-emerald-800 leading-relaxed">
                By transitioning individuals from compulsive novelty-seeking to circular wardrobe stewardship, ReApparel helps eliminate overproduction, curbs textile landfill emissions, and fosters a sustainable sharing economy.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
