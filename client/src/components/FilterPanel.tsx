import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import api from '../lib/api';

interface FilterPanelProps {
  filters: {
    remote: boolean;
    minSalary: string;
    stages: string[];
    tech: string[];
  };
  onChange: (filters: any) => void;
  onClose: () => void;
}

function FilterPanel({ filters, onChange, onClose }: FilterPanelProps) {
  const [options, setOptions] = useState({
    stages: [] as string[],
    techStack: [] as string[],
  });

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/startups/filters');
      setOptions(response.data);
    } catch (err) {
      console.error('Failed to fetch filter options');
    }
  };

  const toggleStage = (stage: string) => {
    const newStages = filters.stages.includes(stage)
      ? filters.stages.filter((s) => s !== stage)
      : [...filters.stages, stage];
    onChange({ ...filters, stages: newStages });
  };

  const toggleTech = (tech: string) => {
    const newTech = filters.tech.includes(tech)
      ? filters.tech.filter((t) => t !== tech)
      : [...filters.tech, tech];
    onChange({ ...filters, tech: newTech });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-4"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Remote Toggle */}
      <div className="mb-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.remote}
            onChange={(e) => onChange({ ...filters, remote: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700">Remote only</span>
        </label>
      </div>

      {/* Min Salary */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary</label>
        <select
          value={filters.minSalary}
          onChange={(e) => onChange({ ...filters, minSalary: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Any</option>
          <option value="100000">$100k+</option>
          <option value="150000">$150k+</option>
          <option value="200000">$200k+</option>
          <option value="250000">$250k+</option>
        </select>
      </div>

      {/* Stages */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Stage</label>
        <div className="flex flex-wrap gap-2">
          {options.stages.map((stage) => (
            <button
              key={stage}
              onClick={() => toggleStage(stage)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filters.stages.includes(stage)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tech Stack</label>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {options.techStack.slice(0, 20).map((tech) => (
            <button
              key={tech}
              onClick={() => toggleTech(tech)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filters.tech.includes(tech)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tech}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default FilterPanel;