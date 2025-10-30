import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  CampaignTriggerConfig,
  CampaignMessage,
  CustomerCommunicationPreferences,
  CampaignQueueItem,
  CampaignMetrics,
} from '../types';
import { calculateCampaignMetrics, renderTemplate } from '../utils/campaigns';

interface CRMAutomationViewProps {
  campaignTriggers: CampaignTriggerConfig[];
  campaignMessages: CampaignMessage[];
  customerPreferences: CustomerCommunicationPreferences[];
  campaignQueue: CampaignQueueItem[];
  onUpdateTrigger: (trigger: CampaignTriggerConfig) => void;
  onToggleTriggerStatus: (triggerId: number) => void;
  onUpdatePreferences: (preferences: CustomerCommunicationPreferences) => void;
  onRemoveFromQueue: (queueItemId: number) => void;
}

type Tab = 'triggers' | 'queue' | 'messages' | 'preferences' | 'analytics' | 'templates';

const CRMAutomationView: React.FC<CRMAutomationViewProps> = ({
  campaignTriggers,
  campaignMessages,
  customerPreferences,
  campaignQueue,
  onUpdateTrigger,
  onToggleTriggerStatus,
  onUpdatePreferences,
  onRemoveFromQueue,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [editingTrigger, setEditingTrigger] = useState<CampaignTriggerConfig | null>(null);
  const [editingPreferences, setEditingPreferences] = useState<CustomerCommunicationPreferences | null>(null);
  const [selectedTemplateTriggerId, setSelectedTemplateTriggerId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'delivered' | 'failed' | 'queued'>('all');

  // Calculate metrics
  const metrics = useMemo(() => {
    return calculateCampaignMetrics(campaignMessages, campaignTriggers);
  }, [campaignMessages, campaignTriggers]);

  // Filter messages
  const filteredMessages = useMemo(() => {
    let filtered = campaignMessages;

    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.campaignName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(m => m.status === filterStatus);
    }

    return filtered.sort((a, b) =>
      new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime()
    );
  }, [campaignMessages, searchTerm, filterStatus]);

  // Tabs
  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'triggers', label: 'Campaign Triggers', icon: '⚡' },
    { id: 'queue', label: 'Message Queue', icon: '📬' },
    { id: 'messages', label: 'Sent Messages', icon: '✉️' },
    { id: 'preferences', label: 'Customer Preferences', icon: '⚙️' },
    { id: 'templates', label: 'Template Editor', icon: '✏️' },
  ];

  const getTriggerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      booking_abandonment: 'Booking Abandonment',
      lifecycle_pregnancy: 'Pregnancy Lifecycle',
      lifecycle_time_since_scan: 'Time Since Scan',
      membership_renewal: 'Membership Renewal',
      reactivation: 'Reactivation',
      post_visit_upsell: 'Post-Visit Upsell',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sent' },
      queued: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Queued' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
      pending: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Pending' },
      sending: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Sending' },
    };
    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return (
      <span className={`${badge.bg} ${badge.text} text-xs font-semibold px-2.5 py-0.5 rounded`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Analytics View
  const renderAnalytics = () => {
    const channelData = [
      { name: 'Email', value: campaignMessages.filter(m => m.channel === 'email').length },
      { name: 'SMS', value: campaignMessages.filter(m => m.channel === 'sms').length },
    ];

    const performanceData = metrics.campaignBreakdown.map(c => ({
      name: c.campaignName.length > 20 ? c.campaignName.substring(0, 20) + '...' : c.campaignName,
      conversions: c.conversions,
      revenue: c.revenue,
      conversionRate: c.conversionRate,
    }));

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Messages Sent</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalMessagesSent.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-1">↗ {metrics.totalMessagesDelivered} delivered</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Open Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.openRate}%</p>
                <p className="text-sm text-gray-500 mt-1">{metrics.totalOpens} opens</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Conversions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalConversions}</p>
                <p className="text-sm text-purple-600 mt-1">{metrics.conversionRate}% rate</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">£{metrics.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-1">{metrics.roi}% ROI</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-full">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Messages by Channel</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Campaign Performance */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={10} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="conversions" fill="#3B82F6" name="Conversions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Breakdown Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Campaign Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conv. Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.campaignBreakdown.map((campaign) => (
                  <tr key={campaign.campaignId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{campaign.campaignName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{campaign.messagesSent}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{campaign.opens} ({campaign.openRate.toFixed(1)}%)</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{campaign.clicks} ({campaign.clickRate.toFixed(1)}%)</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{campaign.conversions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">£{campaign.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        campaign.conversionRate >= 10 ? 'bg-green-100 text-green-800' :
                        campaign.conversionRate >= 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {campaign.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Campaign Triggers View
  const renderTriggers = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Campaign Triggers</h3>
            <p className="text-sm text-gray-600 mt-1">Manage automated campaign triggers and their settings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {campaignTriggers.map((trigger) => (
            <div key={trigger.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-semibold text-gray-900">{trigger.name}</h4>
                    {getStatusBadge(trigger.enabled ? 'delivered' : 'cancelled')}
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {getTriggerTypeLabel(trigger.triggerType)}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {trigger.channel.toUpperCase()}
                    </span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      Priority: {trigger.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{trigger.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500">Delay</p>
                      <p className="text-sm font-medium text-gray-900">{trigger.delayMinutes} min</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Send Window</p>
                      <p className="text-sm font-medium text-gray-900">{trigger.sendWindowStart} - {trigger.sendWindowEnd}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Max/Week</p>
                      <p className="text-sm font-medium text-gray-900">{trigger.maxMessagesPerWeek}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Max/Campaign</p>
                      <p className="text-sm font-medium text-gray-900">{trigger.maxMessagesPerCampaign || '∞'}</p>
                    </div>
                  </div>

                  {trigger.conditions && Object.keys(trigger.conditions).length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <p className="text-xs font-medium text-gray-700 mb-1">Conditions:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(trigger.conditions).map(([key, value]) => (
                          <span key={key} className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                            {key}: {Array.isArray(value) ? value.join(', ') : value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setEditingTrigger(trigger)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onToggleTriggerStatus(trigger.id)}
                    className={`px-3 py-1.5 text-sm rounded ${
                      trigger.enabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {trigger.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Message Queue View
  const renderQueue = () => {
    const pendingQueue = campaignQueue.filter(q => q.status === 'pending');
    const sendingQueue = campaignQueue.filter(q => q.status === 'sending');

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Message Queue</h3>
          <p className="text-sm text-gray-600 mt-1">{pendingQueue.length} pending, {sendingQueue.length} sending</p>
        </div>

        {campaignQueue.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No messages in queue</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaignQueue.map((item) => {
                  const trigger = campaignTriggers.find(t => t.id === item.campaignTriggerId);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.patientName}</div>
                        <div className="text-xs text-gray-500">
                          {item.channel === 'email' ? item.patientEmail : item.patientPhone}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{trigger?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase">
                          {item.channel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.scheduledFor)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.priority}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.attempts}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => onRemoveFromQueue(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Sent Messages View
  const renderMessages = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sent Messages</h3>
            <p className="text-sm text-gray-600 mt-1">{filteredMessages.length} messages</p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search by patient or campaign..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="queued">Queued</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Engagement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMessages.map((message) => (
                  <tr key={message.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(message.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{message.patientName}</div>
                      <div className="text-xs text-gray-500">
                        {message.channel === 'email' ? message.patientEmail : message.patientPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{message.campaignName}</div>
                      {message.subject && <div className="text-xs text-gray-500">{message.subject}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase">
                        {message.channel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {message.sentAt ? formatDate(message.sentAt) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {message.opened && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            ✓ Opened
                          </span>
                        )}
                        {message.clicked && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            ✓ Clicked
                          </span>
                        )}
                        {!message.opened && !message.clicked && message.status === 'delivered' && (
                          <span className="text-xs text-gray-400">No engagement</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {message.converted ? (
                        <div>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            ✓ Converted
                          </span>
                          {message.conversionValue && (
                            <div className="text-xs text-green-600 font-medium mt-1">
                              £{message.conversionValue}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Customer Preferences View
  const renderPreferences = () => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Customer Communication Preferences</h3>
          <p className="text-sm text-gray-600 mt-1">Manage customer consent and communication settings</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email Consent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SMS Consent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marketing</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preferred Channel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quiet Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max/Week</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customerPreferences.map((pref) => (
                <tr key={pref.id} className={`hover:bg-gray-50 ${pref.unsubscribedFromAll ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{pref.patientName}</div>
                    <div className="text-xs text-gray-500">{pref.patientEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {pref.emailConsent ? (
                      <span className="text-green-600">✓ Yes</span>
                    ) : (
                      <span className="text-red-600">✗ No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {pref.smsConsent ? (
                      <span className="text-green-600">✓ Yes</span>
                    ) : (
                      <span className="text-red-600">✗ No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {pref.marketingConsent ? (
                      <span className="text-green-600">✓ Yes</span>
                    ) : (
                      <span className="text-red-600">✗ No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase">
                      {pref.preferredChannel || 'email'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pref.quietHoursEnabled ? (
                      <span>{pref.quietHoursStart} - {pref.quietHoursEnd}</span>
                    ) : (
                      <span className="text-gray-400">Disabled</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pref.maxMessagesPerWeek || '∞'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setEditingPreferences(pref)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pref.unsubscribedFromAll && (
          <div className="mt-2 text-xs text-red-600">
            Unsubscribed on {new Date(pref.unsubscribedAt!).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  };

  // Template Editor View
  const renderTemplateEditor = () => {
    const selectedTrigger = selectedTemplateTriggerId
      ? campaignTriggers.find(t => t.id === selectedTemplateTriggerId)
      : null;

    const mergeFields = [
      '{{patientName}}',
      '{{serviceName}}',
      '{{cartTotal}}',
      '{{bookingUrl}}',
      '{{appointmentDate}}',
      '{{lastVisitDate}}',
      '{{pregnancyWeek}}',
      '{{membershipPlan}}',
      '{{renewalDate}}',
      '{{renewalAmount}}',
      '{{availableCredits}}',
      '{{upsellUrl}}',
    ];

    const handleSaveTemplate = () => {
      if (!selectedTrigger) return;
      onUpdateTrigger(selectedTrigger);
      alert('Template saved successfully!');
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Template Editor</h3>
          <p className="text-sm text-gray-600 mt-1">Edit email and SMS templates with merge fields</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Campaign Trigger</label>
            <select
              value={selectedTemplateTriggerId || ''}
              onChange={(e) => setSelectedTemplateTriggerId(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a trigger --</option>
              {campaignTriggers.map((trigger) => (
                <option key={trigger.id} value={trigger.id}>
                  {trigger.name} ({trigger.channel})
                </option>
              ))}
            </select>
          </div>

          {selectedTrigger && (
            <>
              {/* Merge Fields Reference */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Available Merge Fields</h4>
                <div className="flex flex-wrap gap-2">
                  {mergeFields.map((field) => (
                    <button
                      key={field}
                      onClick={() => {
                        navigator.clipboard.writeText(field);
                        alert(`Copied ${field} to clipboard!`);
                      }}
                      className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                    >
                      {field}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">Click to copy merge field to clipboard</p>
              </div>

              {/* Email Template */}
              {selectedTrigger.channel === 'email' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Template (HTML)</label>
                  <textarea
                    value={selectedTrigger.emailTemplate}
                    onChange={(e) => {
                      const updated = { ...selectedTrigger, emailTemplate: e.target.value };
                      setSelectedTemplateTriggerId(updated.id);
                    }}
                    rows={15}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="<html>...</html>"
                  />
                </div>
              )}

              {/* SMS Template */}
              {selectedTrigger.smsTemplate && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMS Template</label>
                  <textarea
                    value={selectedTrigger.smsTemplate}
                    onChange={(e) => {
                      const updated = { ...selectedTrigger, smsTemplate: e.target.value };
                      setSelectedTemplateTriggerId(updated.id);
                    }}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="SMS message..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Character count: {selectedTrigger.smsTemplate.length} / 160
                  </p>
                </div>
              )}

              {/* Template Preview */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Template Preview</label>
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: renderTemplate(
                        selectedTrigger.emailTemplate || selectedTrigger.smsTemplate || '',
                        {
                          patientName: 'Jane Doe',
                          serviceName: 'Prenatal Scan (20wk)',
                          cartTotal: '220',
                          bookingUrl: 'https://sonorecall.com/book/abc123',
                          appointmentDate: '2025-02-15',
                          lastVisitDate: '2024-12-20',
                          pregnancyWeek: '20',
                        }
                      )
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedTemplateTriggerId(null)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Template
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">CRM Automation</h2>
        <p className="text-sm text-gray-600 mt-1">Manage automated campaigns, triggers, and customer communications</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'analytics' && renderAnalytics()}
      {activeTab === 'triggers' && renderTriggers()}
      {activeTab === 'queue' && renderQueue()}
      {activeTab === 'messages' && renderMessages()}
      {activeTab === 'preferences' && renderPreferences()}
      {activeTab === 'templates' && renderTemplateEditor()}

      {/* Edit Trigger Modal */}
      {editingTrigger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Campaign Trigger</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Name</label>
                  <input
                    type="text"
                    value={editingTrigger.name}
                    onChange={(e) => setEditingTrigger({ ...editingTrigger, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editingTrigger.description}
                    onChange={(e) => setEditingTrigger({ ...editingTrigger, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delay (minutes)</label>
                    <input
                      type="number"
                      value={editingTrigger.delayMinutes}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, delayMinutes: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <input
                      type="number"
                      value={editingTrigger.priority}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, priority: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Send Window Start</label>
                    <input
                      type="time"
                      value={editingTrigger.sendWindowStart}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, sendWindowStart: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Send Window End</label>
                    <input
                      type="time"
                      value={editingTrigger.sendWindowEnd}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, sendWindowEnd: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Messages/Week</label>
                    <input
                      type="number"
                      value={editingTrigger.maxMessagesPerWeek}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, maxMessagesPerWeek: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Messages/Campaign</label>
                    <input
                      type="number"
                      value={editingTrigger.maxMessagesPerCampaign || ''}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, maxMessagesPerCampaign: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingTrigger.respectQuietHours}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, respectQuietHours: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Respect Quiet Hours</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingTrigger.trackOpens}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, trackOpens: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Track Opens</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingTrigger.trackClicks}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, trackClicks: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Track Clicks</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEditingTrigger(null)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onUpdateTrigger(editingTrigger);
                    setEditingTrigger(null);
                  }}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Preferences Modal */}
      {editingPreferences && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Communication Preferences</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">{editingPreferences.patientName}</p>
                  <p className="text-xs text-gray-500">{editingPreferences.patientEmail}</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingPreferences.emailConsent}
                      onChange={(e) => setEditingPreferences({ ...editingPreferences, emailConsent: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Email Consent</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingPreferences.smsConsent}
                      onChange={(e) => setEditingPreferences({ ...editingPreferences, smsConsent: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">SMS Consent</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingPreferences.marketingConsent}
                      onChange={(e) => setEditingPreferences({ ...editingPreferences, marketingConsent: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Marketing Consent</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Channel</label>
                  <select
                    value={editingPreferences.preferredChannel}
                    onChange={(e) => setEditingPreferences({ ...editingPreferences, preferredChannel: e.target.value as 'email' | 'sms' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Messages Per Week</label>
                  <input
                    type="number"
                    value={editingPreferences.maxMessagesPerWeek || ''}
                    onChange={(e) => setEditingPreferences({ ...editingPreferences, maxMessagesPerWeek: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEditingPreferences(null)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onUpdatePreferences(editingPreferences);
                    setEditingPreferences(null);
                  }}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMAutomationView;
