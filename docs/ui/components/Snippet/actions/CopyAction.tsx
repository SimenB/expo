import { ClipboardIcon } from '@expo/styleguide-icons/outline/ClipboardIcon';
import { useState } from 'react';

import { SnippetAction, SnippetActionProps } from '../SnippetAction';

type CopyActionProps = SnippetActionProps & {
  text: string;
};

export const CopyAction = ({ text, ...rest }: CopyActionProps) => {
  const [copyDone, setCopyDone] = useState(false);

  const onCopyClick = () => {
    void navigator.clipboard?.writeText(text);
    setCopyDone(true);
    setTimeout(() => {
      setCopyDone(false);
    }, 1500);
  };

  return (
    <SnippetAction
      leftSlot={<ClipboardIcon className="icon-sm text-icon-secondary max-sm-gutters:-mr-1" />}
      onClick={onCopyClick}
      disabled={copyDone}
      aria-label="Copy content"
      {...rest}>
      <span className="max-sm-gutters:hidden">{copyDone ? 'Copied!' : 'Copy'}</span>
    </SnippetAction>
  );
};
