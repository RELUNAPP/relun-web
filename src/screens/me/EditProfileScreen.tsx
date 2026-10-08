import { useEffect, useState } from 'react';
import { BackButton, PrimaryButton } from '../../components/Buttons';
import { InfoNote } from '../../components/Controls';
import { LabeledField, RelunTextField } from '../../components/Inputs';
import { profile } from '../../data/repositories';
import { messenger, useApp } from '../../data/store';
import { useAppActions } from '../../navigation/actions';
import { RelunColors, T } from '../../theme';

const words = { autoCapitalize: 'words' } as const;

/** Name, bio, work, school, city and interests. Age and segment are fixed at signup. */
export function EditProfileScreen() {
  const me = useApp((s) => s.me);
  const actions = useAppActions();

  const [name, setName] = useState(me?.name ?? '');
  const [bio, setBio] = useState(me?.bio ?? '');
  const [job, setJob] = useState(me?.occupation ?? '');
  const [school, setSchool] = useState(me?.education ?? '');
  const [city, setCity] = useState(me?.city ?? '');
  const [interests, setInterests] = useState((me?.interests ?? []).join(', '));
  const [saving, setSaving] = useState(false);

  // remember(start): the fields reset when the profile itself changes.
  useEffect(() => {
    setName(me?.name ?? '');
    setBio(me?.bio ?? '');
    setJob(me?.occupation ?? '');
    setSchool(me?.education ?? '');
    setCity(me?.city ?? '');
    setInterests((me?.interests ?? []).join(', '));
  }, [me]);

  const save = async () => {
    setSaving(true);
    try {
      await profile.updateDetails({
        fullName: name.trim() || undefined,
        bio: bio.trim(),
        occupation: job.trim(),
        education: school.trim(),
        city: city.trim(),
        interests: [
          ...new Set(
            interests
              .split(',')
              .map((i) => i.trim())
              .filter((i) => i !== ''),
          ),
        ].slice(0, 10),
      });
      messenger.success('Profile saved');
      actions.back();
    } catch (e) {
      messenger.error((e instanceof Error && e.message) || 'Couldn’t save your profile.');
    }
    setSaving(false);
  };

  return (
    <div
      className="status-pad nav-pad"
      style={{ position: 'absolute', inset: 0, background: RelunColors.Background, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px' }}>
        <BackButton onClick={actions.back} />
        <span style={{ ...T.headlineSmall, color: RelunColors.Ink }}>Edit profile</span>
      </div>
      <div className="scroll" style={{ flex: 1 }}>
        <div style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <LabeledField label="Full name">
            <RelunTextField value={name} onChange={(v) => setName(v.slice(0, 100))} inputProps={words} />
          </LabeledField>
          <LabeledField label="Bio" trailingLabel={`${bio.length}/150`}>
            <RelunTextField
              value={bio}
              onChange={(v) => setBio(v.slice(0, 150))}
              placeholder="Something true and a little specific…"
              singleLine={false}
              minLines={3}
              textStyle={{ ...T.bodyLarge, fontSize: 16 }}
            />
          </LabeledField>
          <LabeledField label="Work" trailingLabel="Optional">
            <RelunTextField value={job} onChange={(v) => setJob(v.slice(0, 80))} placeholder="e.g. Architect" inputProps={words} />
          </LabeledField>
          <LabeledField label="Education" trailingLabel="Optional">
            <RelunTextField
              value={school}
              onChange={(v) => setSchool(v.slice(0, 80))}
              placeholder="e.g. University of Lagos"
              inputProps={words}
            />
          </LabeledField>
          <LabeledField label="City" trailingLabel="Optional">
            <RelunTextField value={city} onChange={(v) => setCity(v.slice(0, 80))} placeholder="e.g. Lekki, Lagos" inputProps={words} />
          </LabeledField>
          <LabeledField label="Interests" trailingLabel="Comma separated">
            <RelunTextField
              value={interests}
              onChange={(v) => setInterests(v.slice(0, 200))}
              placeholder="Jazz, Hiking, Cooking"
            />
          </LabeledField>
          <InfoNote text="Your date of birth and what you’re looking for can’t be changed." icon="lock" />
        </div>
      </div>
      <div style={{ padding: '12px 24px' }}>
        <PrimaryButton text="Save" onClick={() => void save()} enabled={name.trim() !== ''} loading={saving} />
      </div>
    </div>
  );
}
