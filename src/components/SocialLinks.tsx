interface SocialLinksProps {
  user: {
    social_github?: string
    social_twitter?: string
    social_qq?: string
    social_wechat?: string
    social_telegram?: string
    social_bilibili?: string
    social_email?: string
    social_facebook?: string
  }
  size?: 'sm' | 'md'
}

export default function SocialLinks({ user, size = 'md' }: SocialLinksProps) {
  const links: Array<{
    key: string
    cls: string
    href?: string
    title: string
    icon: React.ReactNode
  }> = []

  if (user?.social_github?.trim()) {
    links.push({
      key: 'github',
      cls: 'social-link--github',
      href: `https://github.com/${user.social_github.trim()}`,
      title: `GitHub: ${user.social_github.trim()}`,
      icon: <GithubIcon />,
    })
  }
  if (user?.social_twitter?.trim()) {
    links.push({
      key: 'twitter',
      cls: 'social-link--twitter',
      href: `https://twitter.com/${user.social_twitter.trim()}`,
      title: `Twitter/X: ${user.social_twitter.trim()}`,
      icon: <TwitterIcon />,
    })
  }
  if (user?.social_qq?.trim()) {
    links.push({
      key: 'qq',
      cls: 'social-link--qq',
      href: `tencent://message/?uin=${user.social_qq.trim()}`,
      title: `QQ: ${user.social_qq.trim()}`,
      icon: <QqIcon />,
    })
  }
  if (user?.social_wechat?.trim()) {
    links.push({
      key: 'wechat',
      cls: 'social-link--wechat',
      title: `微信号: ${user.social_wechat.trim()}`,
      icon: <WechatIcon />,
    })
  }
  if (user?.social_telegram?.trim()) {
    links.push({
      key: 'telegram',
      cls: 'social-link--telegram',
      href: `https://t.me/${user.social_telegram.trim()}`,
      title: `Telegram: ${user.social_telegram.trim()}`,
      icon: <TelegramIcon />,
    })
  }
  if (user?.social_bilibili?.trim()) {
    links.push({
      key: 'bilibili',
      cls: 'social-link--bilibili',
      href: `https://space.bilibili.com/${user.social_bilibili.trim()}`,
      title: `B站: ${user.social_bilibili.trim()}`,
      icon: <BilibiliIcon />,
    })
  }
  if (user?.social_email?.trim()) {
    links.push({
      key: 'email',
      cls: 'social-link--email',
      href: `mailto:${user.social_email.trim()}`,
      title: `邮箱: ${user.social_email.trim()}`,
      icon: <EmailIcon />,
    })
  }
  if (user?.social_facebook?.trim()) {
    links.push({
      key: 'facebook',
      cls: 'social-link--facebook',
      href: `https://facebook.com/${user.social_facebook.trim()}`,
      title: `Facebook: ${user.social_facebook.trim()}`,
      icon: <FacebookIcon />,
    })
  }

  if (links.length === 0) return null

  const sizeClass = size === 'sm' ? 'social-link--sm' : ''

  return (
    <div className={`social-links ${size === 'sm' ? 'article-author-social' : ''}`.trim()}>
      {links.map((l) =>
        l.href ? (
          <a
            key={l.key}
            href={l.href}
            target={l.href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className={`social-link ${l.cls} ${sizeClass}`.trim()}
            title={l.title}
          >
            {l.icon}
          </a>
        ) : (
          <span
            key={l.key}
            className={`social-link ${l.cls} ${sizeClass}`.trim()}
            title={l.title}
          >
            {l.icon}
          </span>
        )
      )}
    </div>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.61 8.21 11.16.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.34-1.72-1.34-1.72-1.09-.73.08-.72.08-.72 1.21.08 1.85 1.22 1.85 1.22 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.57-2.67-.3-5.47-1.31-5.47-5.83 0-1.29.47-2.34 1.24-3.17-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.21a11.6 11.6 0 0 1 6 0c2.29-1.53 3.3-1.21 3.3-1.21.66 1.66.24 2.88.12 3.18.77.83 1.24 1.88 1.24 3.17 0 4.53-2.81 5.53-5.49 5.82.43.36.81 1.08.81 2.18 0 1.58-.01 2.85-.01 3.24 0 .31.22.68.83.56A12.04 12.04 0 0 0 24 12.29C24 5.78 18.63.5 12 .5z" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

function QqIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.003 0c-3.314 0-6.003 2.687-6.003 6.003 0 .862.184 1.682.512 2.422-1.047.953-2.219 2.584-2.219 5.057 0 .43.05.836.123 1.219-.708.328-1.416.797-1.416 1.4 0 .9 1.275 1.612 2.146 1.93.184.589.46 1.146.785 1.62-.708.43-1.553 1.107-1.553 1.81 0 1.146 2.05 1.93 4.288 1.93.785 0 1.516-.082 2.155-.232.43.334.953.557 1.516.557s1.087-.223 1.516-.557c.64.15 1.37.232 2.155.232 2.238 0 4.288-.784 4.288-1.93 0-.703-.845-1.38-1.553-1.81.326-.474.601-1.031.785-1.62.871-.318 2.146-1.03 2.146-1.93 0-.603-.708-1.072-1.416-1.4.073-.383.123-.789.123-1.219 0-2.473-1.172-4.104-2.219-5.057.328-.74.512-1.56.512-2.422C18.006 2.687 15.317 0 12.003 0z" />
    </svg>
  )
}

function WechatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.86c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1 .193-.555C23.156 18.437 24 16.743 24 14.886c0-3.302-3.05-5.989-6.84-6.034zm-2.293 3.2c.534 0 .967.44.967.983a.976.976 0 0 1-.967.984.976.976 0 0 1-.967-.984c0-.543.433-.983.967-.983zm4.844 0c.534 0 .967.44.967.983a.976.976 0 0 1-.967.984.976.976 0 0 1-.967-.984c0-.543.433-.983.967-.983z" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.324-.437.89-.663 3.478-1.474 5.797-2.448 6.956-2.924 3.315-1.386 4.006-1.627 4.456-1.636z" />
    </svg>
  )
}

function BilibiliIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906L17.813 4.653zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.764-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.249-.56.373-.933.373s-.684-.124-.933-.373c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.387-.947.258-.257.574-.386.946-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.249-.56.373-.933.373s-.684-.124-.933-.373c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.387-.947.258-.257.574-.386.946-.386z" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}
