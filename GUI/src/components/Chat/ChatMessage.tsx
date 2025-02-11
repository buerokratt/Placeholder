import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import {
  MdCheck,
  MdClose,
  MdOutlineCreate,
  MdOutlineCheck,
} from 'react-icons/md';
import { Message } from '../../types/message';
import { CHAT_EVENTS, MessageStatus } from '../../types/chat';
import Markdownify from './Markdownify';
import { useTranslation } from 'react-i18next';
import './Typing.scss';
import { parseButtons, parseOptions } from 'utils/parse-utils';
import ButtonMessage from 'components/ButtonMessage';
import OptionMessage from 'components/OptionMessage';
import Track from 'components/Track';
import Icon from 'components/Icon';
import { HiOutlinePencil } from 'react-icons/hi';
import Button from 'components/Button';
import FormTextarea from 'components/FormElements/FormTextarea';
import { apiDev } from 'services/api';
import { useToast } from 'hooks/useToast';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';

type ChatMessageProps = {
  message: Message;
  onSelect: (message: Message) => void;
  selected: boolean;
  editableMessage?: boolean;
};

const ChatMessage: FC<ChatMessageProps> = ({
  message,
  onSelect,
  selected,
  editableMessage,
}) => {
  const { t } = useTranslation();

  const buttons = useMemo(() => parseButtons(message), [message.buttons]);
  const options = useMemo(() => parseOptions(message), [message.options]);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(message.content ?? '');
  const [inputContent, setInputContent] = useState(content);
  const [messageHeight, setMessageHeight] = useState(0);
  const messageRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  useEffect(() => {
    setMessageHeight(messageRef?.current?.clientHeight ?? 0);
  });

  const approveMessage = useMutation({
    mutationFn: (data: { chatId: string; messageId: string }) => {
      return apiDev.post(`chats/messages/approve-validation`, {
        chatId: data.chatId,
        messageId: data.messageId,
      });
    },
    onSuccess: async () => {
      toast.open({
        type: 'success',
        title: t('global.notification'),
        message: t('chat.validations.messageApproved'),
      });
      return true;
    },
    onError: (error: AxiosError) => {
      toast.open({
        type: 'error',
        title: t('global.notificationError'),
        message: error.message,
      });
      return false;
    },
  });

  return (
    <div className={clsx('active-chat__messageContainer')}>
      <div
        className={clsx('active-chat__message', {
          'active-chat__message--selected': selected,
        })}
      >
        {(message.event === CHAT_EVENTS.GREETING ||
          message.event === CHAT_EVENTS.WAITING_VALIDATION ||
          message.event === CHAT_EVENTS.APPROVED_VALIDATION ||
          !message.event) && (
          <>
            <button
              className={clsx('active-chat__message-text')}
              ref={messageRef}
              onClick={() => onSelect(message)}
            >
              <Track direction={isEditing ? 'vertical' : 'horizontal'}>
                {message.event === CHAT_EVENTS.WAITING_VALIDATION &&
                  isEditing && (
                    <FormTextarea
                      name={''}
                      label={''}
                      minRows={1}
                      maxRows={-1}
                      maxLength={-1}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        width: '400px',
                      }}
                      defaultValue={content}
                      onChange={(e) => {
                        setInputContent(e.target.value);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      autoFocus
                    />
                  )}
                {!isEditing && <Markdownify message={content} />}
                {!message.content && options.length > 0 && 'ok'}
                {editableMessage && !isEditing && (
                  <MdOutlineCreate className="active-chat__edit-icon" />
                )}
                {message.event === CHAT_EVENTS.WAITING_VALIDATION && (
                  <button
                    style={{
                      color: 'white',
                      alignSelf: 'end',
                      paddingTop: '0.3rem',
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMessageHeight(messageRef?.current?.clientHeight ?? 0);
                      setIsEditing(true);
                    }}
                  >
                    <Icon
                      icon={<HiOutlinePencil fontSize={18} />}
                      size="medium"
                    />
                  </button>
                )}
              </Track>
            </button>
            <Track
              direction="horizontal"
              style={{
                height: messageHeight,
                justifyContent: 'center',
              }}
            >
              <div>
                <time
                  dateTime={message.created ?? message.authorTimestamp}
                  className="active-chat__message-date"
                  style={{ alignSelf: 'center' }}
                >
                  {format(
                    new Date(message.created ?? message.authorTimestamp),
                    'HH:mm:ss'
                  )}
                </time>
              </div>
              {message.event === CHAT_EVENTS.WAITING_VALIDATION &&
                isEditing && (
                  <Track
                    style={{
                      position: 'absolute',
                      bottom: 0,
                    }}
                    gap={2}
                  >
                    <Icon
                      style={{ cursor: 'pointer' }}
                      icon={
                        <MdCheck
                          fontSize={22}
                          color="#308653"
                          onClick={async () => {
                            if (inputContent.length === 0) return;
                            try {
                              await apiDev.post('chats/messages/edit', {
                                chatId: message.chatId,
                                messageId: message.id ?? '',
                                content: inputContent,
                              });
                              setIsEditing(false);
                              setContent(inputContent);
                              toast.open({
                                type: 'success',
                                title: t('global.notification'),
                                message: t('chat.validations.messageChanged'),
                              });
                            } catch (_) {
                              toast.open({
                                type: 'error',
                                title: t('global.notificationError'),
                                message: t(
                                  'chat.validations.messageChangeFailed'
                                ),
                              });
                            }
                          }}
                        />
                      }
                      size="medium"
                    />
                    <Icon
                      style={{ cursor: 'pointer' }}
                      icon={
                        <MdClose
                          fontSize={22}
                          color="#D73E3E"
                          onClick={() => {
                            setIsEditing(false);
                            setInputContent(content ?? '');
                          }}
                        />
                      }
                      size="medium"
                    />
                  </Track>
                )}
            </Track>
            {selected && (
              <div className="active-chat__selection-icon">
                <MdOutlineCheck />
              </div>
            )}
          </>
        )}
      </div>
      {message.event === CHAT_EVENTS.WAITING_VALIDATION && (
        <Button
          appearance="success"
          style={{
            borderRadius: '50px',
            marginTop: '5px',
            marginLeft: '-55px',
            paddingLeft: '40px',
            paddingRight: '40px',
            display: 'absolute',
            right: '10',
          }}
          onClick={() => {
            approveMessage.mutate({
              chatId: message.chatId,
              messageId: message.id ?? '',
            });
          }}
        >
          {t('chat.validations.confirmAnswer')}
        </Button>
      )}
      {buttons.length > 0 && <ButtonMessage buttons={buttons} />}
      {options.length > 0 && <OptionMessage options={options} />}
      {message.event === CHAT_EVENTS.READ ? (
        <span className="active-chat__message-status">
          {t('global.read')}
          <time dateTime={message.authorTimestamp}>
            {' '}
            {format(new Date(message.authorTimestamp), 'HH:mm:ss')}
          </time>
        </span>
      ) : null}{' '}
    </div>
  );
};

export default ChatMessage;
