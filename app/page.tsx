'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

interface Inputs {
  admins: number;
  directors: number;
  avgAnnualSurvey: number;
  meetingsPerYear: number;
  saasMonthly?: number;
}

interface Calculations {
  totalAdminCost: number;
  totalDirectorCost: number;
  totalMeetingCost: number;
  totalAnnualCost: number;
  saasAnnualCost?: number;
  savings?: number;
}

export default function Home() {
  const [inputs, setInputs] = useState<Inputs>({
    admins: 2,
    directors: 10,
    avgAnnualSurvey: 150000,
    meetingsPerYear: 24,
  });

  const [calculations, setCalculations] = useState<Calculations | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Check localStorage for payment access
  useEffect(() => {
    const access = localStorage.getItem('roiCalculatorAccess');
    if (access === 'true') {
      setHasAccess(true);
    }

    // Check URL for session_id (after successful payment)
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session_id');
    if (sid) {
      setSessionId(sid);
      localStorage.setItem('roiCalculatorAccess', 'true');
      setHasAccess(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Calculate ROI
  const calculateROI = () => {
    const costPerMeeting = (inputs.avgAnnualSurvey / 100) * 0.15; // ~15% of avg salary per meeting
    const adminCost = inputs.admins * inputs.meetingsPerYear * costPerMeeting * 4; // 4 hours per meeting
    const directorCost = inputs.directors * inputs.meetingsPerYear * costPerMeeting * 2; // 2 hours per meeting

    let result: Calculations = {
      totalAdminCost: adminCost,
      totalDirectorCost: directorCost,
      totalMeetingCost: adminCost + directorCost,
      totalAnnualCost: adminCost + directorCost,
    };

    if (hasAccess && inputs.saasMonthly) {
      result.saasAnnualCost = inputs.saasMonthly * 12;
      result.savings = result.totalAnnualCost - result.saasAnnualCost;
    }

    setCalculations(result);
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-3">
            Meeting ROI Calculator
          </h1>
          <p className="text-xl text-slate-300">
            for onboardmeetings.com
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-slate-800 rounded-lg p-8 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              Your Inputs
            </h2>

            <div className="space-y-6">
              {/* Admins Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Number of Admins
                </label>
                <input
                  type="number"
                  min="1"
                  value={inputs.admins}
                  onChange={(e) =>
                    setInputs({ ...inputs, admins: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Directors Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Number of Directors
                </label>
                <input
                  type="number"
                  min="1"
                  value={inputs.directors}
                  onChange={(e) =>
                    setInputs({ ...inputs, directors: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Average Annual Salary Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Avg Annual Salary of Directors
                </label>
                <div className="flex items-center">
                  <span className="text-white mr-2">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={inputs.avgAnnualSurvey}
                    onChange={(e) =>
                      setInputs({ ...inputs, avgAnnualSurvey: parseInt(e.target.value) || 0 })
                    }
                    className="flex-1 px-4 py-2 rounded bg-slate-700 text-white border border-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Meetings Per Year Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Meetings Per Year
                </label>
                <input
                  type="number"
                  min="1"
                  value={inputs.meetingsPerYear}
                  onChange={(e) =>
                    setInputs({ ...inputs, meetingsPerYear: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* SaaS Cost (Premium) */}
              {hasAccess && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Your Monthly SaaS Cost
                  </label>
                  <div className="flex items-center">
                    <span className="text-white mr-2">$</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="Enter monthly cost"
                      value={inputs.saasMonthly || ''}
                      onChange={(e) =>
                        setInputs({ ...inputs, saasMonthly: parseInt(e.target.value) || 0 })
                      }
                      className="flex-1 px-4 py-2 rounded bg-slate-700 text-white border border-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Calculate Button */}
              <button
                onClick={calculateROI}
                className="w-full mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition duration-200"
              >
                Calculate ROI
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-slate-800 rounded-lg p-8 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              Annual Cost Analysis
            </h2>

            {!calculations ? (
              <div className="flex items-center justify-center h-96 text-slate-400">
                <p>Click "Calculate ROI" to see results</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Admin Cost */}
                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-300 text-sm mb-1">Admin Time Cost</p>
                  <p className="text-3xl font-bold text-green-400">
                    ${calculations.totalAdminCost.toLocaleString('en-US', {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>

                {/* Director Cost */}
                <div className="bg-slate-700 rounded p-4">
                  <p className="text-slate-300 text-sm mb-1">Director Time Cost</p>
                  <p className="text-3xl font-bold text-green-400">
                    ${calculations.totalDirectorCost.toLocaleString('en-US', {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>

                {/* Total Cost */}
                <div className="bg-slate-700 rounded p-4 border-2 border-yellow-500">
                  <p className="text-slate-300 text-sm mb-1">Total Annual Cost</p>
                  <p className="text-4xl font-bold text-yellow-400">
                    ${calculations.totalAnnualCost.toLocaleString('en-US', {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>

                {/* Savings (Premium) */}
                {hasAccess && calculations.savings !== undefined && (
                  <div className="bg-emerald-900 rounded p-4 border-2 border-emerald-500">
                    <p className="text-emerald-200 text-sm mb-1">Annual Savings with OnBoard</p>
                    <p className="text-4xl font-bold text-emerald-400">
                      ${calculations.savings.toLocaleString('en-US', {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-emerald-300 text-xs mt-2">
                      Monthly SaaS Cost: ${inputs.saasMonthly?.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Unlock Button */}
                {!hasAccess && (
                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full mt-8 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition duration-200 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Unlock Savings Calculator - $29'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-12 text-center text-slate-400 text-sm">
          <p>
            💡 Free basic calculations • 💳 One-time $29 payment for savings comparison
          </p>
        </div>
      </div>
    </div>
  );
}
