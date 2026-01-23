import React from 'react';
import { Country } from '../types';
import { Globe } from 'lucide-react';

interface CountrySelectorProps {
  selected: Country;
  onSelect: (country: Country) => void;
  disabled: boolean;
  label: string;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({ selected, onSelect, disabled, label }) => {
  return (
    <div className="flex flex-col space-y-3 mb-6">
      <div className="flex items-center text-gray-700 font-semibold text-sm uppercase tracking-wider">
        <Globe className="w-4 h-4 mr-2 text-ur-blue" />
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.values(Country).map((country) => (
          <button
            key={country}
            onClick={() => onSelect(country)}
            disabled={disabled}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border
              ${selected === country
                ? 'bg-ur-blue text-white border-ur-blue shadow-md transform scale-105'
                : 'bg-white text-gray-600 border-gray-200 hover:border-ur-lightBlue hover:text-ur-blue'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {country}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CountrySelector;