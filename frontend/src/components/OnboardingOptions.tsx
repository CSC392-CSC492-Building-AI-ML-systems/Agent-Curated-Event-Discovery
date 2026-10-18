type Props = {
  name: string;
  label: string;
  options: readonly string[];
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
        <label className="onboarding-option" key={option}>
          <input
            type={multiple ? "checkbox" : "radio"}
            name={name}
            value={option}
            checked={selected.includes(option)}
            onChange={() => onChange(option)}
          />
          <span className="onboarding-option-card">{option}</span>
        </label>
      ))}
    </fieldset>
  );
}
