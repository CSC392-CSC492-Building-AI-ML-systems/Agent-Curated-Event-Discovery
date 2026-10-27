type Props = {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  selected: readonly string[];
  multiple?: boolean;
  layout?: "age" | "budget" | "interests";
  onChange: (value: string) => void;
};

export default function OnboardingOptions({
  name, label, options, selected, multiple = false, layout = "age", onChange,
}: Props) {
  return (
    <fieldset className={`onboarding-options onboarding-options-${layout}`}>
      <legend className="onboarding-visually-hidden">{label}</legend>
      {options.map(option => (
        <label className="onboarding-option" key={option.value}>
          <input
            type={multiple ? "checkbox" : "radio"}
            name={name}
            value={option.value}
            checked={selected.includes(option.value)}
            onChange={() => onChange(option.value)}
          />
          <span className="onboarding-option-card">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
