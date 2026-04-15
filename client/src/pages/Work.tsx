import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, Building2, Users, MessageSquare, BarChart3,
  Settings, HelpCircle, FileText, Shield
} from 'lucide-react';

function Work() {
  const [, setActiveSection] = useState('jobs');

  const sections = [
    {
      id: 'jobs',
      title: 'My Jobs',
      icon: Briefcase,
      description: 'Manage your job applications and saved jobs'
    },
    {
      id: 'companies',
      title: 'Companies',
      icon: Building2,
      description: 'Browse and follow companies'
    },
    {
      id: 'connections',
      title: 'Connections',
      icon: Users,
      description: 'Your professional network'
    },
    {
      id: 'messages',
      title: 'Messages',
      icon: MessageSquare,
      description: 'Chat with recruiters and connections'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: BarChart3,
      description: 'View your profile analytics'
    }
  ];

  const quickLinks = [
    { title: 'Resume Builder', icon: FileText, description: 'Create or update your resume' },
    { title: 'Privacy Settings', icon: Shield, description: 'Manage your privacy preferences' },
    { title: 'Help Center', icon: HelpCircle, description: 'Get help and support' },
    { title: 'Account Settings', icon: Settings, description: 'Manage your account' }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-[#191919] mb-6">Work</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Sections */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="section-title mb-4">Quick Access</h2>
          {sections.map((section) => (
            <motion.div
              key={section.id}
              whileHover={{ scale: 1.01 }}
              className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveSection(section.id)}
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-[#E3F0FE] rounded-lg">
                  <section.icon className="w-6 h-6 text-[#0A66C2]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#191919]">{section.title}</h3>
                  <p className="text-sm text-[#666666]">{section.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="section-title mb-4">Tools & Settings</h2>
          <div className="card divide-y divide-[#E0E0E0]">
            {quickLinks.map((link, idx) => (
              <div 
                key={idx}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <link.icon className="w-5 h-5 text-[#666666]" />
                  <div>
                    <h4 className="font-medium text-[#191919]">{link.title}</h4>
                    <p className="text-xs text-[#8C8C8C]">{link.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Coming Soon */}
          <div className="card p-4 mt-4 bg-gradient-to-r from-[#E3F0FE] to-[#F3F2EF]">
            <h3 className="font-semibold text-[#0A66C2] mb-2">Coming Soon</h3>
            <ul className="text-sm text-[#666666] space-y-1">
              <li>• Salary insights</li>
              <li>• Interview prep</li>
              <li>• Career coaching</li>
              <li>• Skills assessments</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Work;