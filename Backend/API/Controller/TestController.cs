using Application;
using Application.DTO.Create;
using Domain;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller;
[ApiController]
[Route("[controller]")]
public class TestController : ControllerBase
{
    private readonly ITestService _testService;

    public TestController(ITestService testService)
    {
        _testService = testService;
    }
    
    [HttpPost]
    public IActionResult Test([FromBody] TestCreateDTO inputTest)
    {
        try
        {
            return Ok(_testService.Test(inputTest));
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
       
    }
    
    [HttpGet]
    public IActionResult GetTestMessages()
    {
        try
        {
            return Ok(_testService.GetTests());
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet]
    [Route("{id}")]
    public IActionResult GetTestById([FromRoute] int id)
    {
        try
        {
            return Ok(_testService.GetTestById(id));
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete]
    [Route("{id}")]
    public IActionResult DeleteTest([FromRoute] int id)
    {
        try
        {
            return Ok(_testService.DeleteTestById(id));
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
    
}