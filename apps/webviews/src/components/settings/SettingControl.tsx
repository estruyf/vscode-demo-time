import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Icon } from 'vscrui';
import { SettingDefinition } from '@demotime/common';
import { Switch } from '../ui/Switch';
import { Input } from '../ui/Input';
import { PathInput } from '../ui/PathInput';
import { Button } from '../ui/Button';
import { ColorValueInput } from '../ui/ColorValueInput';
import {
  EnhancedSelect,
  EnhancedSelectContent,
  EnhancedSelectItem,
  EnhancedSelectTrigger,
  EnhancedSelectValue,
} from '../ui/EnhancedSelect';

export interface SettingControlProps {
  definition: SettingDefinition;
  value: unknown;
  defaultValue: unknown;
  onChange: (value: unknown) => void;
}

const toNumber = (value: string): number | undefined => {
  if (value.trim() === '') {
    return undefined;
  }
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const NumberInput: React.FC<SettingControlProps> = ({
  definition,
  value,
  defaultValue,
  onChange,
}) => {
  const placeholder =
    definition.placeholder ??
    (typeof defaultValue === 'number' ? `Default: ${defaultValue}` : undefined);

  return (
    <div className="flex items-center gap-2 max-w-60">
      <Input
        type="number"
        aria-label={definition.label}
        min={definition.min}
        max={definition.max}
        step={definition.step}
        placeholder={placeholder}
        value={typeof value === 'number' ? String(value) : ''}
        onChange={(newValue) => onChange(toNumber(newValue))}
      />
      {definition.unit && (
        <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{definition.unit}</span>
      )}
    </div>
  );
};

const SelectInput: React.FC<SettingControlProps> = ({ definition, value, onChange }) => {
  const options = definition.options || [];
  const selected = options.find((option) => option.value === value);

  return (
    <div className="max-w-md">
      <EnhancedSelect
        value={String(value ?? '')}
        onValueChange={(newValue: string) => onChange(newValue)}
      >
        <EnhancedSelectTrigger>
          <EnhancedSelectValue value={selected?.label ?? String(value ?? '')} />
        </EnhancedSelectTrigger>
        <EnhancedSelectContent>
          {options.map((option) => (
            <EnhancedSelectItem key={option.value} value={option.value}>
              <span className="block">{option.label}</span>
              {option.description && (
                <span className="block text-xs opacity-75">{option.description}</span>
              )}
            </EnhancedSelectItem>
          ))}
        </EnhancedSelectContent>
      </EnhancedSelect>
    </div>
  );
};

const ViewTogglesInput: React.FC<SettingControlProps> = ({ definition, value, onChange }) => {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const options = definition.options || [];

  const toggle = (optionValue: string, checked: boolean) => {
    // Keep the order of the options
    const next = options
      .map((option) => option.value)
      .filter((item) => (item === optionValue ? checked : selected.includes(item)));
    onChange(next);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 max-w-xl">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={(e) => toggle(option.value, e.target.checked)}
            className="accent-demo-time-accent"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
};

const HighlightZoomInput: React.FC<SettingControlProps> = ({ definition, value, onChange }) => {
  const isEnabled = value === true || (typeof value === 'number' && value > 0);
  // Remember the steps when turning the zoom off and on again
  const lastSteps = React.useRef<number | undefined>(typeof value === 'number' ? value : undefined);
  if (typeof value === 'number' && value > 0) {
    lastSteps.current = value;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
        <Switch
          ariaLabel={definition.label}
          checked={isEnabled}
          onCheckedChange={(checked) => onChange(checked ? (lastSteps.current ?? true) : false)}
        />
        {isEnabled ? 'On' : 'Off'}
      </label>
      {isEnabled && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">Zoom steps</span>
          <div className="w-24">
            <Input
              type="number"
              aria-label="Zoom steps"
              min={definition.min}
              max={definition.max}
              placeholder="1"
              value={typeof value === 'number' ? String(value) : ''}
              onChange={(newValue) => onChange(toNumber(newValue) || true)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ListInput: React.FC<SettingControlProps> = ({ definition, value, onChange }) => {
  const items = Array.isArray(value) ? (value as string[]) : [];
  const [newItem, setNewItem] = React.useState('');
  const isPath = definition.control === 'pathList';

  const add = () => {
    const item = newItem.trim();
    if (item && !items.includes(item)) {
      onChange([...items, item]);
    }
    setNewItem('');
  };

  return (
    <div className="space-y-2 max-w-xl">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <Input
            aria-label={`${definition.label} ${index + 1}`}
            value={item}
            className="font-mono text-sm"
            onChange={(newValue) =>
              onChange(items.map((current, i) => (i === index ? newValue : current)))
            }
          />
          <Button
            className="shrink-0"
            variant="secondary"
            size="sm"
            icon={Trash2}
            title="Remove"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            {''}
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        {isPath ? (
          <PathInput
            value={newItem}
            placeholder={definition.placeholder}
            type="file"
            fileTypes={definition.fileTypes}
            onChange={setNewItem}
          />
        ) : (
          <div
            className="w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          >
            <Input
              aria-label={`New ${definition.label.toLowerCase()}`}
              value={newItem}
              placeholder={definition.placeholder}
              className="font-mono text-sm"
              onChange={setNewItem}
            />
          </div>
        )}
        <Button
          className="shrink-0"
          size="sm"
          icon={Plus}
          title="Add"
          disabled={!newItem.trim()}
          onClick={add}
        >
          {''}
        </Button>
      </div>
    </div>
  );
};

const SecretInput: React.FC<SettingControlProps> = ({ definition, value, onChange }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div className="space-y-2 max-w-xl">
      <div className="relative">
        <input
          type={isVisible ? 'text' : 'password'}
          aria-label={definition.label}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={definition.placeholder}
          autoComplete="off"
          className="w-full pr-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent"
        />
        <button
          type="button"
          aria-pressed={isVisible}
          onClick={() => setIsVisible((visible) => !visible)}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-500 dark:text-gray-300 hover:text-gray-700 cursor-pointer"
          title={isVisible ? 'Hide API key' : 'Show API key'}
          aria-label={isVisible ? 'Hide API key' : 'Show API key'}
        >
          <Icon
            name={isVisible ? 'eye-closed' : 'eye'}
            className="text-xl h-full !flex !items-center"
          />
        </button>
      </div>
      <a
        href="https://engagetime.live/speaker/api-keys"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm underline text-blue-600 dark:text-blue-400 hover:text-blue-800"
      >
        Manage your API keys in EngageTime
      </a>
    </div>
  );
};

export const SettingControl: React.FC<SettingControlProps> = (props) => {
  const { definition, value, onChange } = props;

  switch (definition.control) {
    case 'boolean':
      return (
        <Switch ariaLabel={definition.label} checked={value === true} onCheckedChange={onChange} />
      );
    case 'number':
      return <NumberInput {...props} />;
    case 'select':
      return <SelectInput {...props} />;
    case 'viewToggles':
      return <ViewTogglesInput {...props} />;
    case 'highlightZoom':
      return <HighlightZoomInput {...props} />;
    case 'pathList':
    case 'stringList':
      return <ListInput {...props} />;
    case 'secret':
      return <SecretInput {...props} />;
    case 'color':
      return (
        <div className="max-w-xl">
          <ColorValueInput
            label={definition.label}
            value={typeof value === 'string' ? value : ''}
            onChange={onChange}
          />
        </div>
      );
    case 'path':
      return (
        <div className="max-w-xl">
          <PathInput
            value={typeof value === 'string' ? value : ''}
            placeholder={definition.placeholder}
            type="file"
            fileTypes={definition.fileTypes}
            onChange={onChange}
          />
        </div>
      );
    case 'text':
    default:
      return (
        <div className="max-w-xl">
          <Input
            aria-label={definition.label}
            value={typeof value === 'string' ? value : ''}
            placeholder={
              definition.placeholder ??
              (typeof props.defaultValue === 'string' && props.defaultValue
                ? props.defaultValue
                : undefined)
            }
            onChange={onChange}
          />
        </div>
      );
  }
};
