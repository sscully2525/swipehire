import { Router } from 'express';
import { query } from '../db';
import { verifyAccessToken } from '../models/user';
import { logger } from '../logger';

const router = Router();

const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get full profile with all sections
router.get('/full', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    
    const [
      userResult,
      workResult,
      educationResult,
      honorsResult,
      certificationsResult,
      projectsResult,
      languagesResult,
      volunteerResult,
      publicationsResult
    ] = await Promise.all([
      query('SELECT * FROM users WHERE id = $1', [userId]),
      query('SELECT * FROM work_experience WHERE user_id = $1 ORDER BY is_current DESC, end_date DESC NULLS FIRST, start_date DESC', [userId]),
      query('SELECT * FROM education WHERE user_id = $1 ORDER BY is_current DESC, end_date DESC NULLS FIRST', [userId]),
      query('SELECT * FROM honors_awards WHERE user_id = $1 ORDER BY issue_date DESC', [userId]),
      query('SELECT * FROM certifications WHERE user_id = $1 ORDER BY issue_date DESC', [userId]),
      query('SELECT * FROM projects WHERE user_id = $1 ORDER BY is_current DESC, end_date DESC NULLS FIRST', [userId]),
      query('SELECT * FROM languages WHERE user_id = $1', [userId]),
      query('SELECT * FROM volunteer_experience WHERE user_id = $1 ORDER BY is_current DESC, end_date DESC NULLS FIRST', [userId]),
      query('SELECT * FROM publications WHERE user_id = $1 ORDER BY publication_date DESC', [userId])
    ]);
    
    res.json({
      user: userResult.rows[0],
      workExperience: workResult.rows,
      education: educationResult.rows,
      honorsAwards: honorsResult.rows,
      certifications: certificationsResult.rows,
      projects: projectsResult.rows,
      languages: languagesResult.rows,
      volunteerExperience: volunteerResult.rows,
      publications: publicationsResult.rows
    });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Get full profile error');
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Work Experience Routes
router.post('/work-experience', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { companyName, title, location, startDate, endDate, isCurrent, description, employmentType } = req.body;
    
    const result = await query(
      `INSERT INTO work_experience (user_id, company_name, title, location, start_date, end_date, is_current, description, employment_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, companyName, title, location, startDate, endDate || null, isCurrent || false, description, employmentType]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Add work experience error');
    res.status(500).json({ error: 'Failed to add work experience' });
  }
});

router.put('/work-experience/:id', authenticate, async (req, res) => {
  try {
    const { companyName, title, location, startDate, endDate, isCurrent, description, employmentType } = req.body;
    
    const result = await query(
      `UPDATE work_experience 
       SET company_name = $1, title = $2, location = $3, start_date = $4, end_date = $5, 
           is_current = $6, description = $7, employment_type = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10 RETURNING *`,
      [companyName, title, location, startDate, endDate || null, isCurrent || false, description, employmentType, req.params.id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work experience not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Update work experience error');
    res.status(500).json({ error: 'Failed to update work experience' });
  }
});

router.delete('/work-experience/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM work_experience WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work experience not found' });
    }
    
    res.json({ message: 'Work experience deleted' });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Delete work experience error');
    res.status(500).json({ error: 'Failed to delete work experience' });
  }
});

// Education Routes
router.post('/education', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { schoolName, degree, fieldOfStudy, startDate, endDate, isCurrent, description, gpa, activities } = req.body;
    
    const result = await query(
      `INSERT INTO education (user_id, school_name, degree, field_of_study, start_date, end_date, is_current, description, gpa, activities)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [userId, schoolName, degree, fieldOfStudy, startDate, endDate || null, isCurrent || false, description, gpa, activities]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Add education error');
    res.status(500).json({ error: 'Failed to add education' });
  }
});

router.put('/education/:id', authenticate, async (req, res) => {
  try {
    const { schoolName, degree, fieldOfStudy, startDate, endDate, isCurrent, description, gpa, activities } = req.body;
    
    const result = await query(
      `UPDATE education 
       SET school_name = $1, degree = $2, field_of_study = $3, start_date = $4, end_date = $5,
           is_current = $6, description = $7, gpa = $8, activities = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND user_id = $11 RETURNING *`,
      [schoolName, degree, fieldOfStudy, startDate, endDate || null, isCurrent || false, description, gpa, activities, req.params.id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Education not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Update education error');
    res.status(500).json({ error: 'Failed to update education' });
  }
});

router.delete('/education/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM education WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Education not found' });
    }
    
    res.json({ message: 'Education deleted' });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Delete education error');
    res.status(500).json({ error: 'Failed to delete education' });
  }
});

// Skills Routes
router.post('/skills', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { skill } = req.body;
    
    await query(
      'UPDATE users SET skills = array_append(skills, $1) WHERE id = $2 AND NOT ($1 = ANY(skills))',
      [skill, userId]
    );
    
    res.json({ message: 'Skill added' });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Add skill error');
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

router.delete('/skills/:skill', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE users SET skills = array_remove(skills, $1) WHERE id = $2',
      [req.params.skill, req.userId]
    );
    
    res.json({ message: 'Skill removed' });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Remove skill error');
    res.status(500).json({ error: 'Failed to remove skill' });
  }
});

// Resume Upload
router.post('/resume', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { resumeUrl } = req.body;
    
    await query(
      'UPDATE users SET resume_url = $1 WHERE id = $2',
      [resumeUrl, userId]
    );
    
    res.json({ message: 'Resume updated' });
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Update resume error');
    res.status(500).json({ error: 'Failed to update resume' });
  }
});

// Update basic profile
router.put('/basic', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { firstName, lastName, title, bio, location, linkedinUrl, githubUrl, portfolioUrl, websiteUrl } = req.body;
    
    const result = await query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           title = COALESCE($3, title),
           bio = COALESCE($4, bio),
           location = COALESCE($5, location),
           linkedin_url = COALESCE($6, linkedin_url),
           github_url = COALESCE($7, github_url),
           portfolio_url = COALESCE($8, portfolio_url),
           website_url = COALESCE($9, website_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [firstName, lastName, title, bio, location, linkedinUrl, githubUrl, portfolioUrl, websiteUrl, userId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ err: error, userId: req.userId }, 'Update basic profile error');
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
