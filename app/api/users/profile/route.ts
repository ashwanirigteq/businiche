import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession, hashPassword } from '@/lib/auth';

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, companyName, email, emailPassword, smtpHost, smtpPort, incomingServerHost, incomingServerPort, customPlacesApiKey, password } = body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters.' }, { status: 400 });
    }

    const cleanFullName = fullName.trim();
    const cleanCompany = companyName ? companyName.trim() : 'Demo';
    const cleanEmail = email ? email.trim() : null;
    const cleanEmailPass = emailPassword ? emailPassword.trim() : null;
    const cleanSmtpHost = smtpHost ? smtpHost.trim() : null;
    const cleanSmtpPort = smtpPort ? parseInt(String(smtpPort), 10) || 465 : 465;
    const cleanIncomingHost = incomingServerHost ? incomingServerHost.trim() : null;
    const cleanIncomingPort = incomingServerPort ? parseInt(String(incomingServerPort), 10) || 993 : 993;
    const cleanApiKey = customPlacesApiKey ? customPlacesApiKey.trim() : null;

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
      }
      const hash = await hashPassword(password);
      await sql`
        UPDATE users
        SET full_name = ${cleanFullName},
            company_name = ${cleanCompany},
            email = ${cleanEmail},
            email_password = ${cleanEmailPass},
            smtp_host = ${cleanSmtpHost},
            smtp_port = ${cleanSmtpPort},
            incoming_server_host = ${cleanIncomingHost},
            incoming_server_port = ${cleanIncomingPort},
            custom_places_api_key = ${cleanApiKey},
            password_hash = ${hash}
        WHERE id = ${session.userId};
      `;
    } else {
      await sql`
        UPDATE users
        SET full_name = ${cleanFullName},
            company_name = ${cleanCompany},
            email = ${cleanEmail},
            email_password = ${cleanEmailPass},
            smtp_host = ${cleanSmtpHost},
            smtp_port = ${cleanSmtpPort},
            incoming_server_host = ${cleanIncomingHost},
            incoming_server_port = ${cleanIncomingPort},
            custom_places_api_key = ${cleanApiKey}
        WHERE id = ${session.userId};
      `;
    }

    return NextResponse.json({
      success: true,
      fullName: cleanFullName,
      companyName: cleanCompany,
      email: cleanEmail,
      smtpHost: cleanSmtpHost,
      smtpPort: cleanSmtpPort,
      incomingServerHost: cleanIncomingHost,
      incomingServerPort: cleanIncomingPort,
    });
  } catch (err: unknown) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}
