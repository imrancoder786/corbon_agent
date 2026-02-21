import React, { useState, useEffect, useRef } from 'react';
import { SupplierDiscoveryAgent } from './agents/SupplierDiscoveryAgent';
import { MonitorAgent } from './agents/MonitorAgent';
import { CalculationAgent } from './agents/CalculationAgent';
import { PolicyAgent } from './agents/PolicyAgent';
import { ReportingAgent } from './agents/ReportingAgent';
import { Supplier, AuditResult, AgentLog } from './types';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { AlertTriangle, CheckCircle, FileText, Activity, ShieldAlert, Play, RotateCw, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

// --- Components ---

const LogViewer = ({ logs }: { logs: AgentLog[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card className="h-64 flex flex-col bg-gray-950 text-gray-100 font-mono text-xs border-gray-800">
      <CardHeader className="py-3 px-4 border-b border-gray-800">
        <CardTitle className="text-sm font-normal text-gray-400">System Logs</CardTitle>
      </CardHeader>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {logs.length === 0 && <span className="text-gray-600 italic">System ready. Waiting for input...</span>}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
            <span className={
              log.type === 'error' ? 'text-red-400' :
              log.type === 'success' ? 'text-emerald-400' :
              log.type === 'warning' ? 'text-amber-400' : 'text-blue-400'
            }>{log.agent}:</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'Approved': return <Badge variant="success">Approved</Badge>;
    case 'Review': return <Badge variant="warning">Review Needed</Badge>;
    case 'HITL_Triggered': return <Badge variant="destructive">HITL Triggered</Badge>;
    case 'Rejected': return <Badge variant="destructive">Rejected</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

const HITLModal = ({ supplier, onDecision }: { supplier: AuditResult, onDecision: (approved: boolean) => void }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border-2 border-red-500"
      >
        <div className="flex items-center gap-3 mb-4 text-red-600">
          <ShieldAlert className="w-8 h-8" />
          <h2 className="text-xl font-bold">High Risk Supplier Detected</h2>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-bold text-lg mb-1">{supplier.supplierName}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">Risk Score</span>
                <span className="font-mono font-bold text-red-600 text-lg">{supplier.riskScore.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Emissions</span>
                <span className="font-mono">{supplier.emissionsNormalized.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-gray-500">Risk Signals</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              {supplier.riskSignals.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
          
          <div className="bg-amber-50 p-3 rounded text-amber-800 text-sm border border-amber-200">
            <strong>Policy Agent:</strong> Score exceeds 0.8 threshold. Human authorization required to proceed.
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="destructive" onClick={() => onDecision(false)}>Reject Supplier</Button>
          <Button variant="default" onClick={() => onDecision(true)}>Override & Approve</Button>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [companyName, setCompanyName] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [hitlTarget, setHitlTarget] = useState<AuditResult | null>(null);
  const [finalReport, setFinalReport] = useState<string | null>(null);

  // Agents
  const discoveryAgent = useRef(new SupplierDiscoveryAgent());
  const monitorAgent = useRef(new MonitorAgent());
  const calculationAgent = useRef(new CalculationAgent());
  const policyAgent = useRef(new PolicyAgent());
  const reportingAgent = useRef(new ReportingAgent());

  const addLog = (agent: string, message: string, type: AgentLog['type'] = 'info') => {
    setLogs(prev => [...prev, { agent, message, timestamp: Date.now(), type }]);
  };

  const runAudit = async () => {
    if (!companyName) return;
    
    setIsRunning(true);
    setLogs([]);
    setSuppliers([]);
    setAuditResults([]);
    setFinalReport(null);
    setHitlTarget(null);

    try {
      // 1. Discovery
      addLog('Orchestrator', `Starting audit for ${companyName}...`, 'info');
      addLog('SupplierDiscoveryAgent', `Searching for suppliers of ${companyName}...`, 'info');
      
      const discoveredSuppliers = await discoveryAgent.current.discover(companyName);
      setSuppliers(discoveredSuppliers);
      addLog('SupplierDiscoveryAgent', `Found ${discoveredSuppliers.length} suppliers.`, 'success');

      // 2. Process each supplier
      const results: AuditResult[] = [];

      for (const supplier of discoveredSuppliers) {
        addLog('Orchestrator', `Processing ${supplier.name}...`, 'info');
        
        // Monitor
        addLog('MonitorAgent', `Scanning risk signals for ${supplier.name}...`, 'info');
        const signals = await monitorAgent.current.monitor(supplier);
        if (signals.details.length > 0) {
          addLog('MonitorAgent', `Signals detected: ${signals.details.length}`, 'warning');
        }

        // Calculate
        const score = calculationAgent.current.calculate(supplier, signals);
        addLog('CalculationAgent', `Computed Risk Score: ${score}`, 'info');

        // Policy
        const status = policyAgent.current.evaluate(score);
        addLog('PolicyAgent', `Status: ${status}`, status === 'Approved' ? 'success' : 'warning');

        const result: AuditResult = {
          supplierId: supplier.id,
          supplierName: supplier.name,
          riskSignals: signals,
          emissionsNormalized: supplier.estimatedEmissions,
          riskScore: score,
          status: status,
          auditTimestamp: new Date().toISOString()
        };

        // HITL Check
        if (status === 'HITL_Triggered') {
          addLog('Orchestrator', 'HITL Triggered. Pausing workflow for user input.', 'error');
          
          // Wait for user decision via Promise
          const decision = await new Promise<boolean>((resolve) => {
            setHitlTarget(result);
            // We attach the resolver to a temporary global or ref to be called by the modal
            (window as any).resolveHitl = resolve; 
          });

          setHitlTarget(null);
          
          if (decision) {
            result.status = 'Approved'; // Override
            addLog('Orchestrator', 'User overrode HITL. Supplier Approved.', 'success');
          } else {
            result.status = 'Rejected';
            addLog('Orchestrator', 'User confirmed rejection.', 'error');
          }
        }

        results.push(result);
        setAuditResults([...results]); // Update UI incrementally
      }

      // 3. Reporting
      addLog('ReportingAgent', 'Generating executive summary...', 'info');
      const report = await reportingAgent.current.generateReport(companyName, results);
      setFinalReport(report);
      addLog('ReportingAgent', 'Report generated successfully.', 'success');
      addLog('Orchestrator', 'Workflow complete.', 'success');

    } catch (error) {
      console.error(error);
      addLog('Orchestrator', 'Workflow failed due to error.', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleHitlDecision = (approved: boolean) => {
    if ((window as any).resolveHitl) {
      (window as any).resolveHitl(approved);
      (window as any).resolveHitl = undefined;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
            <h1 className="text-xl font-bold tracking-tight">Carbon Footprint Optimization Engine</h1>
          </div>
          <div className="text-sm text-gray-500 font-mono">v1.0.0 • Multi-Agent System</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Input Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle>Audit Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Target Company</label>
                <Input 
                  placeholder="e.g. Tata Motors" 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isRunning}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={runAudit} 
                disabled={!companyName || isRunning}
              >
                {isRunning ? (
                  <><RotateCw className="mr-2 h-4 w-4 animate-spin" /> Running Agents...</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" /> Start Compliance Audit</>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <LogViewer logs={logs} />
          </div>
        </section>

        {/* Dashboard Section */}
        {auditResults.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Audit Dashboard</h2>
              <Badge variant="outline" className="text-sm py-1 px-3">
                {auditResults.length} Suppliers Processed
              </Badge>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Risk Score Distribution</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={auditResults}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="supplierName" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                      <YAxis domain={[0, 1]} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="riskScore" radius={[4, 4, 0, 0]}>
                        {auditResults.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={
                            entry.riskScore >= 0.8 ? '#ef4444' : 
                            entry.riskScore >= 0.5 ? '#f59e0b' : '#10b981'
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Compliance Status</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-emerald-600">
                        {auditResults.filter(r => r.status === 'Approved').length}
                      </span>
                      <span className="text-sm text-emerald-800 font-medium">Approved</span>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-amber-600">
                        {auditResults.filter(r => r.status === 'Review').length}
                      </span>
                      <span className="text-sm text-amber-800 font-medium">Review</span>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-red-600">
                        {auditResults.filter(r => r.status === 'HITL_Triggered').length}
                      </span>
                      <span className="text-sm text-red-800 font-medium">HITL Triggered</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-gray-600">
                        {auditResults.filter(r => r.status === 'Rejected').length}
                      </span>
                      <span className="text-sm text-gray-800 font-medium">Rejected</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Supplier Table */}
            <Card>
              <CardHeader><CardTitle>Supplier Details</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3">Supplier</th>
                        <th className="px-6 py-3">Score</th>
                        <th className="px-6 py-3">Emissions</th>
                        <th className="px-6 py-3">Risk Signals</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditResults.map((result) => (
                        <tr key={result.supplierId} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{result.supplierName}</td>
                          <td className="px-6 py-4 font-mono">{result.riskScore.toFixed(3)}</td>
                          <td className="px-6 py-4">{result.emissionsNormalized.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            {result.riskSignals.details.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {result.riskSignals.details.map((d, i) => (
                                  <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 truncate max-w-[200px]" title={d}>
                                    {d}
                                  </span>
                                ))}
                              </div>
                            ) : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={result.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Final Report */}
        {finalReport && (
          <section>
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <CardTitle>Executive Report</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Download className="mr-2 h-4 w-4" /> Export PDF
                </Button>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none p-8 text-gray-700">
                <ReactMarkdown>{finalReport}</ReactMarkdown>
              </CardContent>
            </Card>
          </section>
        )}

      </main>

      {/* HITL Modal Overlay */}
      <AnimatePresence>
        {hitlTarget && (
          <HITLModal supplier={hitlTarget} onDecision={handleHitlDecision} />
        )}
      </AnimatePresence>
    </div>
  );
}
